#!/usr/bin/env node

/**
 * memory-storage.js
 *
 * 记忆库持久化存储脚本（原子写入 + 事务性操作）
 *
 * 命令格式：
 *   echo '<json>' | node .cursor/skills/memory-storage/scripts/memory-storage.js <operation>
 *
 * 操作：
 *   - write: 写入记忆文件 + 更新索引（事务性）
 *   - delete: 删除记忆文件 + 更新索引（事务性）
 *   - update-index: 仅更新索引
 */

const fs = require("fs");
const path = require("path");

// 记忆库根目录
const DEFAULT_MEMORY_ROOT = path.join(
  process.cwd(),
  ".cursor",
  ".lingxi",
  "memory",
);

// 导入 validate-index.js 的函数
const {
  createContext,
  parseIndex,
  scanNotes,
  dedupeNotesById,
  generateIndexContent,
  updateIndexAt,
} = require("./validate-index.js");

/**
 * 备份文件
 */
function backupFile(sourceFile, backupFile) {
  try {
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, backupFile);
    }
  } catch (error) {
    // 备份失败不影响主流程，只记录警告
    console.warn(`Warning: Failed to backup ${sourceFile}: ${error.message}`);
  }
}

/**
 * 原子性写入文件（先写临时文件，再重命名）
 */
function atomicWriteFile(filePath, content) {
  const tempFile = filePath + ".tmp";
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入临时文件
    fs.writeFileSync(tempFile, content, "utf-8");
    // 原子性重命名
    fs.renameSync(tempFile, filePath);
  } catch (error) {
    // 清理临时文件
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (cleanupError) {
      // 忽略清理错误
    }
    throw error;
  }
}

/**
 * 恢复备份文件
 */
function restoreBackup(backupFile, targetFile) {
  try {
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, targetFile);
    }
  } catch (error) {
    throw new Error(`Failed to restore backup: ${error.message}`);
  }
}

/**
 * 清理备份文件
 */
function cleanupBackup(backupFile) {
  try {
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
  } catch (error) {
    // 清理失败不影响主流程，只记录警告
    console.warn(
      `Warning: Failed to cleanup backup ${backupFile}: ${error.message}`,
    );
  }
}

/**
 * 更新索引（读取现有索引，添加/更新条目，原子写入）
 */
function updateIndexEntry(memoryRoot, indexEntry, deletedIds = []) {
  const ctx = createContext(memoryRoot);

  // 确保目录存在
  if (!fs.existsSync(ctx.memoryRoot)) {
    fs.mkdirSync(ctx.memoryRoot, { recursive: true });
  }
  if (!fs.existsSync(ctx.notesDir)) {
    fs.mkdirSync(ctx.notesDir, { recursive: true });
  }

  // 读取现有索引
  const existing = parseIndex(ctx.indexPath);

  // 扫描现有 notes（用于生成完整索引）
  const scanned = scanNotes(ctx.notesDir);
  const { deduped: notes } = dedupeNotesById(scanned);

  // 创建索引条目映射
  const indexMap = new Map();

  // 保留现有索引条目（排除被删除的）
  for (const row of existing.rows) {
    if (row.length < 9) continue; // INDEX_HEADER.length = 9
    const id = row[0];
    if (!deletedIds.includes(id)) {
      indexMap.set(id, row);
    }
  }

  // 添加/更新新条目
  if (indexEntry) {
    const row = [
      indexEntry.id,
      indexEntry.kind || "other",
      indexEntry.title || indexEntry.id,
      (indexEntry.whenToLoad || []).join("；").slice(0, 160),
      indexEntry.status || "active",
      indexEntry.strength || "hypothesis",
      indexEntry.scope || "medium",
      indexEntry.supersedes || "",
      `\`${indexEntry.file}\``,
    ];
    indexMap.set(indexEntry.id, row);
  }

  // 从扫描的 notes 中更新字段（如果索引中没有）
  for (const note of notes) {
    if (!indexMap.has(note.id)) {
      indexMap.set(note.id, [
        note.id,
        note.kind,
        note.title,
        note.whenToLoad,
        "active",
        note.strength,
        note.scope,
        note.supersedes,
        note.file,
      ]);
    }
  }

  // 生成索引内容
  const content = generateIndexContent(
    Array.from(indexMap.values()).map((row) => ({
      id: row[0],
      kind: row[1],
      title: row[2],
      whenToLoad: row[3],
      status: row[4],
      strength: row[5],
      scope: row[6],
      supersedes: row[7],
      file: row[8].replace(/^`|`$/g, ""),
    })),
    existing,
  );

  // 原子写入索引
  atomicWriteFile(ctx.indexPath, content);
}

/**
 * 写入记忆文件和索引（事务性）
 */
function writeMemoryAndIndex(memoryRoot, note, indexEntry) {
  const notePath = path.join(
    process.cwd(),
    ".cursor",
    ".lingxi",
    note.filePath,
  );
  const indexPath = path.join(memoryRoot, "INDEX.md");
  const noteBackup = notePath + ".backup";
  const indexBackup = indexPath + ".backup";

  try {
    // 1. 备份现有文件（如果存在）
    backupFile(notePath, noteBackup);
    backupFile(indexPath, indexBackup);

    // 2. 原子写入记忆文件
    atomicWriteFile(notePath, note.content);

    // 3. 更新索引
    updateIndexEntry(memoryRoot, indexEntry);

    // 4. 成功，清理备份
    cleanupBackup(noteBackup);
    cleanupBackup(indexBackup);
  } catch (error) {
    // 5. 失败，恢复备份
    try {
      restoreBackup(noteBackup, notePath);
      restoreBackup(indexBackup, indexPath);
    } catch (restoreError) {
      console.error(
        `Error: Failed to write memory and index, and restore failed: ${error.message}. Restore error: ${restoreError.message}`,
      );
      process.exit(1);
    }
    console.error(`Error: Failed to write memory and index: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 删除记忆文件和更新索引（事务性）
 */
function deleteMemoryAndIndex(memoryRoot, noteId, filePath) {
  const notePath = path.join(process.cwd(), ".cursor", ".lingxi", filePath);
  const indexPath = path.join(memoryRoot, "INDEX.md");
  const noteBackup = notePath + ".backup";
  const indexBackup = indexPath + ".backup";

  try {
    // 1. 备份现有文件（如果存在）
    backupFile(notePath, noteBackup);
    backupFile(indexPath, indexBackup);

    // 2. 删除记忆文件
    if (fs.existsSync(notePath)) {
      fs.unlinkSync(notePath);
    }

    // 3. 更新索引（移除条目）
    updateIndexEntry(memoryRoot, null, [noteId]);

    // 4. 成功，清理备份
    cleanupBackup(noteBackup);
    cleanupBackup(indexBackup);
  } catch (error) {
    // 5. 失败，恢复备份
    try {
      restoreBackup(noteBackup, notePath);
      restoreBackup(indexBackup, indexPath);
    } catch (restoreError) {
      console.error(
        `Error: Failed to delete memory and index, and restore failed: ${error.message}. Restore error: ${restoreError.message}`,
      );
      process.exit(1);
    }
    console.error(`Error: Failed to delete memory and index: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 处理操作
 */
function processOperation(operation, data) {
  const memoryRoot = data.memoryRoot || DEFAULT_MEMORY_ROOT;

  switch (operation) {
    case "write":
      if (!data.note || !data.indexEntry) {
        console.error("Error: write operation requires note and indexEntry");
        process.exit(1);
      }
      writeMemoryAndIndex(memoryRoot, data.note, data.indexEntry);
      break;

    case "delete":
      if (!data.noteId || !data.filePath) {
        console.error("Error: delete operation requires noteId and filePath");
        process.exit(1);
      }
      deleteMemoryAndIndex(memoryRoot, data.noteId, data.filePath);
      break;

    case "update-index":
      updateIndexAt(memoryRoot);
      break;

    default:
      console.error(`Error: Unknown operation: ${operation}`);
      process.exit(1);
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  let operation = null;
  let inputFile = null;

  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" && args[i + 1]) {
      inputFile = args[i + 1];
      i++;
    } else if (["write", "delete", "update-index"].includes(arg)) {
      operation = arg;
    }
  }

  if (!operation) {
    console.error(
      "Error: Invalid operation. Must be one of: write, delete, update-index",
    );
    console.error(
      "Usage: node memory-storage.js <operation> [--file <json-file>]",
    );
    console.error("       echo '<json>' | node memory-storage.js <operation>");
    process.exit(1);
  }

  if (inputFile) {
    // 从文件读取（同步）
    try {
      const content = fs.readFileSync(inputFile, "utf-8");
      const data = JSON.parse(content);
      processOperation(operation, data);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error instanceof SyntaxError) {
        console.error("Invalid JSON format in input file.");
      }
      process.exit(1);
    }
  } else {
    // 从 stdin 读取（异步）
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      try {
        const data = JSON.parse(input);
        processOperation(operation, data);
      } catch (error) {
        console.error(`Error: ${error.message}`);
        if (error instanceof SyntaxError) {
          console.error(
            "Invalid JSON format. If using echo with complex JSON, consider using --file option instead.",
          );
        }
        process.exit(1);
      }
    });
    process.stdin.on("error", (error) => {
      console.error(`Error reading from stdin: ${error.message}`);
      process.exit(1);
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  writeMemoryAndIndex,
  deleteMemoryAndIndex,
  updateIndexEntry,
  atomicWriteFile,
  backupFile,
  restoreBackup,
  cleanupBackup,
};
