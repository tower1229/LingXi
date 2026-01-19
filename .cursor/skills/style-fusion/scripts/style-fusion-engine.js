/**
 * Style Fusion Engine
 * 
 * 风格融合引擎：将新提取的风格特征融合到现有风格画像中
 * 
 * 核心算法：
 * - 加权平均融合（新样本权重随样本数递减）
 * - 置信度计算（基于样本数和方差）
 * - 变更检测（识别哪些维度发生了变化）
 */

const fs = require('fs');
const path = require('path');

// 风格画像存储路径
const STYLE_DIR = path.join(process.cwd(), '.cursor', '.lingxi', 'context', 'style-fusion');
const PROFILE_FILE = path.join(STYLE_DIR, 'profile.json');
const STATS_FILE = path.join(STYLE_DIR, 'stats.json');
const PROFILE_BACKUP_FILE = path.join(STYLE_DIR, 'profile.json.backup');
const STATS_BACKUP_FILE = path.join(STYLE_DIR, 'stats.json.backup');

// 数值精度：保留4位小数
const PRECISION = 4;

// 变更检测阈值
const CHANGE_THRESHOLD = 0.1;

// 新维度默认值（用于向后兼容）
const DEFAULT_TONE_AND_VOICE = {
  formality: 0.5,
  person_usage: { first_person: 0.25, second_person: 0.25, third_person: 0.25, neutral: 0.25 },
  voice_preference: 'active'
};

const DEFAULT_INFORMATION_DENSITY = {
  density_level: 0.5,
  detail_level: 'moderate'
};

const DEFAULT_INTERACTIVITY = {
  interaction_style: { question: 0.25, directive: 0.25, narrative: 0.25, dialogue: 0.25 },
  supporting_elements: { examples: 0.25, code: 0.25, diagrams: 0.25, none: 0.25 }
};

// 必需的基础维度（至少需要这些维度之一）
const REQUIRED_BASE_DIMENSIONS = [
  'sentence_length',
  'logic_pattern',
  'emotion_intensity',
  'vocabulary_level',
  'structure_preference',
  'opening_style',
  'closing_style'
];

/**
 * 维度元数据配置
 * 定义每个维度的类型、路径、默认值等信息
 */
const DIMENSION_CONFIG = {
  // 基础分布类维度
  sentence_length: {
    type: 'distribution',
    path: 'sentence_length',
    changeDetection: 'distribution'
  },
  logic_pattern: {
    type: 'distribution',
    path: 'logic_pattern',
    changeDetection: 'distribution'
  },

  // 基础数值类维度
  emotion_intensity: {
    type: 'numeric',
    path: 'emotion_intensity',
    changeDetection: 'numeric',
    range: [0, 1]
  },

  // 基础分类类维度
  vocabulary_level: {
    type: 'categorical',
    path: 'vocabulary_level',
    changeDetection: 'categorical',
    values: ['casual', 'professional', 'academic']
  },
  structure_preference: {
    type: 'categorical',
    path: 'structure_preference',
    changeDetection: 'categorical',
    values: ['linear', 'hierarchical', 'nested']
  },
  opening_style: {
    type: 'categorical',
    path: 'opening_style',
    changeDetection: 'categorical',
    values: ['question', 'statement', 'context', 'direct']
  },
  closing_style: {
    type: 'categorical',
    path: 'closing_style',
    changeDetection: 'categorical',
    values: ['summary', 'reflection', 'call_to_action', 'open']
  },

  // 嵌套维度：tone_and_voice
  tone_and_voice: {
    type: 'nested',
    path: 'tone_and_voice',
    default: DEFAULT_TONE_AND_VOICE,
    fields: {
      formality: {
        type: 'numeric',
        path: 'tone_and_voice.formality',
        changeDetection: 'numeric',
        range: [0, 1]
      },
      person_usage: {
        type: 'distribution',
        path: 'tone_and_voice.person_usage',
        changeDetection: 'distribution'
      },
      voice_preference: {
        type: 'categorical',
        path: 'tone_and_voice.voice_preference',
        changeDetection: 'categorical',
        values: ['active', 'passive', 'mixed']
      }
    }
  },

  // 嵌套维度：information_density
  information_density: {
    type: 'nested',
    path: 'information_density',
    default: DEFAULT_INFORMATION_DENSITY,
    fields: {
      density_level: {
        type: 'numeric',
        path: 'information_density.density_level',
        changeDetection: 'numeric',
        range: [0, 1]
      },
      detail_level: {
        type: 'categorical',
        path: 'information_density.detail_level',
        changeDetection: 'categorical',
        values: ['overview', 'moderate', 'detailed', 'comprehensive']
      }
    }
  },

  // 嵌套维度：interactivity
  interactivity: {
    type: 'nested',
    path: 'interactivity',
    default: DEFAULT_INTERACTIVITY,
    fields: {
      interaction_style: {
        type: 'distribution',
        path: 'interactivity.interaction_style',
        changeDetection: 'distribution'
      },
      supporting_elements: {
        type: 'distribution',
        path: 'interactivity.supporting_elements',
        changeDetection: 'distribution'
      }
    }
  }
};

/**
 * 四舍五入到指定精度
 */
function roundToPrecision(value, precision = PRECISION) {
  if (typeof value !== 'number' || isNaN(value)) return value;
  return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

/**
 * 递归四舍五入对象中的所有数值
 */
function roundObjectValues(obj, precision = PRECISION) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'number') {
    return roundToPrecision(obj, precision);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => roundObjectValues(item, precision));
  }
  
  if (typeof obj === 'object') {
    const rounded = {};
    for (const key in obj) {
      rounded[key] = roundObjectValues(obj[key], precision);
    }
    return rounded;
  }
  
  return obj;
}

/**
 * 验证风格向量的基本完整性
 */
function validateStyleVector(styleVector) {
  if (!styleVector || typeof styleVector !== 'object') {
    throw new Error('Style vector must be an object');
  }

  // 检查是否至少包含一个必需的基础维度
  const hasRequiredDimension = REQUIRED_BASE_DIMENSIONS.some(dim => 
    styleVector[dim] !== undefined && styleVector[dim] !== null
  );

  if (!hasRequiredDimension) {
    throw new Error(`Style vector must contain at least one of the required dimensions: ${REQUIRED_BASE_DIMENSIONS.join(', ')}`);
  }

  // 验证数值范围
  if (styleVector.emotion_intensity !== undefined) {
    if (typeof styleVector.emotion_intensity !== 'number' || 
        styleVector.emotion_intensity < 0 || styleVector.emotion_intensity > 1) {
      throw new Error('emotion_intensity must be a number between 0 and 1');
    }
  }

  // 验证嵌套数值维度
  if (styleVector.tone_and_voice?.formality !== undefined) {
    if (typeof styleVector.tone_and_voice.formality !== 'number' ||
        styleVector.tone_and_voice.formality < 0 || styleVector.tone_and_voice.formality > 1) {
      throw new Error('tone_and_voice.formality must be a number between 0 and 1');
    }
  }

  if (styleVector.information_density?.density_level !== undefined) {
    if (typeof styleVector.information_density.density_level !== 'number' ||
        styleVector.information_density.density_level < 0 || styleVector.information_density.density_level > 1) {
      throw new Error('information_density.density_level must be a number between 0 and 1');
    }
  }

  return true;
}

/**
 * 初始化风格画像目录和文件
 */
function initializeStyleDir() {
  try {
    if (!fs.existsSync(STYLE_DIR)) {
      fs.mkdirSync(STYLE_DIR, { recursive: true });
    }

    if (!fs.existsSync(PROFILE_FILE)) {
      const initialProfile = {
        style_vector: {},
        sample_count: 0,
        last_updated: null,
        confidence: 0
      };
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(initialProfile, null, 2), 'utf-8');
    }

    if (!fs.existsSync(STATS_FILE)) {
      const initialStats = {
        total_samples: 0,
        dimension_variance: {},
        confidence: 0
      };
      fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2), 'utf-8');
    }
  } catch (error) {
    throw new Error(`Failed to initialize style directory: ${error.message}`);
  }
}

/**
 * 加载当前风格画像
 */
function loadProfile() {
  try {
    initializeStyleDir();
    
    if (!fs.existsSync(PROFILE_FILE)) {
      return {
        style_vector: {},
        sample_count: 0,
        last_updated: null,
        confidence: 0
      };
    }

    const content = fs.readFileSync(PROFILE_FILE, 'utf-8');
    const profile = JSON.parse(content);
    return profile;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse profile.json: ${error.message}. The file may be corrupted.`);
    }
    throw new Error(`Failed to load profile: ${error.message}`);
  }
}

/**
 * 加载统计信息
 */
function loadStats() {
  try {
    initializeStyleDir();
    
    if (!fs.existsSync(STATS_FILE)) {
      return {
        total_samples: 0,
        dimension_variance: {},
        confidence: 0
      };
    }

    const content = fs.readFileSync(STATS_FILE, 'utf-8');
    const stats = JSON.parse(content);
    return stats;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse stats.json: ${error.message}. The file may be corrupted.`);
    }
    throw new Error(`Failed to load stats: ${error.message}`);
  }
}

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
  const tempFile = filePath + '.tmp';
  try {
    // 写入临时文件
    fs.writeFileSync(tempFile, content, 'utf-8');
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
 * 保存风格画像和统计信息（事务性）
 */
function saveProfileAndStats(profile, stats) {
  try {
    // 备份原文件
    backupFile(PROFILE_FILE, PROFILE_BACKUP_FILE);
    backupFile(STATS_FILE, STATS_BACKUP_FILE);

    // 四舍五入数值
    const roundedProfile = roundObjectValues(profile);
    const roundedStats = roundObjectValues(stats);

    // 原子性写入
    atomicWriteFile(PROFILE_FILE, JSON.stringify(roundedProfile, null, 2));
    atomicWriteFile(STATS_FILE, JSON.stringify(roundedStats, null, 2));
  } catch (error) {
    // 恢复备份
    try {
      if (fs.existsSync(PROFILE_BACKUP_FILE)) {
        fs.copyFileSync(PROFILE_BACKUP_FILE, PROFILE_FILE);
      }
      if (fs.existsSync(STATS_BACKUP_FILE)) {
        fs.copyFileSync(STATS_BACKUP_FILE, STATS_FILE);
      }
    } catch (restoreError) {
      throw new Error(`Failed to save profile and stats, and restore failed: ${error.message}. Restore error: ${restoreError.message}`);
    }
    throw new Error(`Failed to save profile and stats: ${error.message}`);
  }
}

/**
 * 保存风格画像（已废弃，使用 saveProfileAndStats）
 * @deprecated 使用 saveProfileAndStats 代替
 */
function saveProfile(profile) {
  initializeStyleDir();
  profile.last_updated = new Date().toISOString();
  atomicWriteFile(PROFILE_FILE, JSON.stringify(roundObjectValues(profile), null, 2));
}

/**
 * 保存统计信息（已废弃，使用 saveProfileAndStats）
 * @deprecated 使用 saveProfileAndStats 代替
 */
function saveStats(stats) {
  initializeStyleDir();
  atomicWriteFile(STATS_FILE, JSON.stringify(roundObjectValues(stats), null, 2));
}

/**
 * 归一化分布类维度（通用函数）
 * @param {Object} dist - 分布对象（如 {short: 0.2, medium: 0.6, long: 0.2}）
 * @returns {Object} 归一化后的分布对象
 */
function normalizeDistribution(dist) {
  if (!dist || typeof dist !== 'object') return dist;

  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    Object.keys(dist).forEach(key => {
      dist[key] = roundToPrecision(dist[key] / sum);
    });
  } else {
    // 全零情况：使用均匀分布
    const keys = Object.keys(dist);
    const defaultValue = roundToPrecision(1 / keys.length);
    keys.forEach(key => {
      dist[key] = defaultValue;
    });
  }
  return dist;
}

/**
 * 根据路径获取嵌套对象的值
 * @param {Object} obj - 对象
 * @param {string} path - 路径，如 'tone_and_voice.person_usage'
 * @returns {*} 值
 */
function getNestedValue(obj, path) {
  if (!path) return obj;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * 根据路径设置嵌套对象的值
 * @param {Object} obj - 对象
 * @param {string} path - 路径
 * @param {*} value - 值
 */
function setNestedValue(obj, path, value) {
  if (!path) {
    Object.assign(obj, value);
    return;
  }
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * 标准化风格向量
 * 确保分布类维度的总和为 1.0
 */
function normalizeStyleVector(styleVector) {
  const normalized = { ...styleVector };

  // 需要归一化的分布类维度路径列表
  const distributionPaths = [
    'sentence_length',
    'logic_pattern',
    'tone_and_voice.person_usage',
    'interactivity.interaction_style',
    'interactivity.supporting_elements'
  ];

  distributionPaths.forEach(path => {
    const dist = getNestedValue(normalized, path);
    if (dist) {
      normalizeDistribution(dist);
    }
  });

  return normalized;
}

/**
 * 融合分布类维度（如 sentence_length, logic_pattern）
 */
function fuseDistribution(oldDist, newDist, weightOld, weightNew) {
  const fused = {};
  const allKeys = new Set([...Object.keys(oldDist || {}), ...Object.keys(newDist || {})]);

  allKeys.forEach(key => {
    const oldValue = oldDist?.[key] || 0;
    const newValue = newDist?.[key] || 0;
    fused[key] = weightOld * oldValue + weightNew * newValue;
  });

  // 重新归一化
  const sum = Object.values(fused).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    Object.keys(fused).forEach(key => {
      fused[key] = roundToPrecision(fused[key] / sum);
    });
  } else {
    // 全零情况：使用均匀分布
    const keys = Array.from(allKeys);
    const defaultValue = roundToPrecision(1 / keys.length);
    keys.forEach(key => {
      fused[key] = defaultValue;
    });
  }

  return fused;
}

/**
 * 融合数值类维度（如 emotion_intensity）
 */
function fuseNumeric(oldValue, newValue, weightOld, weightNew) {
  const result = weightOld * (oldValue || 0) + weightNew * (newValue || 0);
  return roundToPrecision(result);
}

/**
 * 融合分类类维度（如 vocabulary_level, structure_preference）
 * 使用加权投票：如果新旧值相同，保持；如果不同，根据权重选择
 */
function fuseCategorical(oldValue, newValue, weightOld, weightNew) {
  if (!oldValue) return newValue;
  if (!newValue) return oldValue;
  if (oldValue === newValue) return oldValue;
  
  // 如果权重差异较大，选择权重更大的值
  // 否则保持旧值（稳定性优先）
  return weightOld >= weightNew ? oldValue : newValue;
}

/**
 * 递归收集所有数值（用于方差计算）
 */
function collectNumericValues(obj, prefix = '') {
  const values = [];
  
  if (obj === null || obj === undefined) {
    return values;
  }
  
  if (typeof obj === 'number') {
    values.push({ path: prefix, value: obj });
    return values;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      values.push(...collectNumericValues(item, `${prefix}[${index}]`));
    });
    return values;
  }
  
  if (typeof obj === 'object') {
    for (const key in obj) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      values.push(...collectNumericValues(obj[key], newPrefix));
    }
    return values;
  }
  
  return values;
}

/**
 * 计算置信度
 * 基于样本数和维度稳定性（支持嵌套方差结构）
 */
function calculateConfidence(sampleCount, dimensionVariance) {
  // 基础置信度：随样本数增长，但增长递减
  const baseConfidence = 1 - Math.exp(-sampleCount / 10);
  
  // 递归收集所有方差值（支持嵌套结构）
  const varianceValues = collectNumericValues(dimensionVariance);
  
  // 计算平均方差惩罚
  let variancePenalty = 0;
  if (varianceValues.length > 0) {
    const sum = varianceValues.reduce((acc, item) => acc + item.value, 0);
    variancePenalty = sum / varianceValues.length;
  }
  
  const varianceFactor = Math.max(0, 1 - variancePenalty);
  
  return roundToPrecision(Math.min(1.0, baseConfidence * varianceFactor));
}

/**
 * 检测分布类维度的变更
 */
function detectDistributionChange(oldDist, newDist, threshold) {
  if (!oldDist || !newDist) {
    return oldDist !== newDist;
  }

  const oldKeys = Object.keys(oldDist);
  const newKeys = Object.keys(newDist);
  const allKeys = new Set([...oldKeys, ...newKeys]);

  for (const key of allKeys) {
    const oldVal = oldDist[key] || 0;
    const newVal = newDist[key] || 0;
    if (Math.abs(oldVal - newVal) > threshold) {
      return true;
    }
  }
  return false;
}

/**
 * 检测数值类维度的变更
 */
function detectNumericChange(oldVal, newVal, threshold) {
  if (oldVal === undefined || newVal === undefined) {
    return oldVal !== newVal;
  }
  return Math.abs(oldVal - newVal) > threshold;
}

/**
 * 检测分类类维度的变更
 */
function detectCategoricalChange(oldVal, newVal) {
  return oldVal !== newVal;
}

/**
 * 检测变更维度（配置驱动）
 */
function detectChanges(oldVector, newVector, threshold = CHANGE_THRESHOLD) {
  const changes = [];

  for (const [dimName, config] of Object.entries(DIMENSION_CONFIG)) {
    if (config.type === 'nested') {
      // 嵌套维度：检查所有子字段
      let nestedChanged = false;
      for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        const oldVal = getNestedValue(oldVector, fieldConfig.path);
        const newVal = getNestedValue(newVector, fieldConfig.path);

        let changed = false;
        switch (fieldConfig.changeDetection) {
          case 'distribution':
            changed = detectDistributionChange(oldVal, newVal, threshold);
            break;
          case 'numeric':
            changed = detectNumericChange(oldVal, newVal, threshold);
            break;
          case 'categorical':
            changed = detectCategoricalChange(oldVal, newVal);
            break;
        }

        if (changed) {
          nestedChanged = true;
          break;
        }
      }
      if (nestedChanged) {
        changes.push(dimName);
      }
    } else {
      // 基础维度
      const oldVal = getNestedValue(oldVector, config.path);
      const newVal = getNestedValue(newVector, config.path);

      let changed = false;
      switch (config.changeDetection) {
        case 'distribution':
          changed = detectDistributionChange(oldVal, newVal, threshold);
          break;
        case 'numeric':
          changed = detectNumericChange(oldVal, newVal, threshold);
          break;
        case 'categorical':
          changed = detectCategoricalChange(oldVal, newVal);
          break;
      }

      if (changed) {
        changes.push(dimName);
      }
    }
  }

  return [...new Set(changes)]; // 去重
}

/**
 * 更新单个数值维度的方差
 */
function updateNumericVariance(variance, path, oldVal, newVal, sampleCount) {
  if (oldVal === undefined || newVal === undefined) return variance;

  const diff = Math.abs(oldVal - newVal);
  const alpha = 1 / (sampleCount + 1);

  // 获取或创建嵌套路径
  const parts = path.split('.');
  let current = variance;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  const key = parts[parts.length - 1];
  const oldVariance = current[key] || 0;
  current[key] = roundToPrecision((1 - alpha) * oldVariance + alpha * diff * diff);

  return variance;
}

/**
 * 更新维度方差（配置驱动）
 */
function updateVariance(stats, oldVector, newVector, sampleCount) {
  const variance = { ...stats.dimension_variance };

  // 遍历所有数值类维度
  for (const [dimName, config] of Object.entries(DIMENSION_CONFIG)) {
    if (config.type === 'nested') {
      // 嵌套维度：处理所有数值类子字段
      for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        if (fieldConfig.type === 'numeric') {
          const oldVal = getNestedValue(oldVector, fieldConfig.path);
          const newVal = getNestedValue(newVector, fieldConfig.path);
          updateNumericVariance(variance, fieldConfig.path, oldVal, newVal, sampleCount);
        }
      }
    } else if (config.type === 'numeric') {
      // 基础数值维度
      const oldVal = getNestedValue(oldVector, config.path);
      const newVal = getNestedValue(newVector, config.path);
      updateNumericVariance(variance, config.path, oldVal, newVal, sampleCount);
    }
  }

  return variance;
}

/**
 * 融合单个维度（配置驱动）
 */
function fuseDimension(oldValue, newValue, config, weightOld, weightNew, defaultValue) {
  if (newValue === undefined) {
    return oldValue;
  }

  const oldVal = oldValue || defaultValue;

  switch (config.type) {
    case 'distribution':
      return fuseDistribution(oldVal, newValue, weightOld, weightNew);
    case 'numeric':
      return fuseNumeric(oldVal, newValue, weightOld, weightNew);
    case 'categorical':
      return fuseCategorical(oldVal, newValue, weightOld, weightNew);
    case 'nested':
      // 嵌套维度：递归融合所有子字段
      const fused = {};
      for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        const oldFieldVal = oldValue ? oldValue[fieldName] : undefined;
        const newFieldVal = newValue ? newValue[fieldName] : undefined;
        const fieldDefault = defaultValue ? defaultValue[fieldName] : undefined;
        fused[fieldName] = fuseDimension(oldFieldVal, newFieldVal, fieldConfig, weightOld, weightNew, fieldDefault);
      }
      return fused;
    default:
      return newValue;
  }
}

/**
 * 主融合函数
 * 
 * @param {Object} newStyleVector - 新提取的风格向量
 * @returns {Object} 融合结果 { status, payload } 或 { status: 'error', error: string }
 */
function fuseStyle(newStyleVector) {
  try {
    // 输入验证
    validateStyleVector(newStyleVector);

    // 标准化新风格向量
    const normalizedNew = normalizeStyleVector(newStyleVector);

    // 加载当前画像
    const profile = loadProfile();
    const stats = loadStats();

    const oldVector = profile.style_vector || {};
    const sampleCount = profile.sample_count || 0;

    // 计算融合权重
    // 新样本权重随样本数增加而递减（避免后期震荡）
    const weightNew = 1 / (sampleCount + 1);
    const weightOld = 1 - weightNew;

    // 融合风格向量（配置驱动）
    const fusedVector = {};

    for (const [dimName, config] of Object.entries(DIMENSION_CONFIG)) {
      const oldVal = getNestedValue(oldVector, config.path);
      const newVal = getNestedValue(normalizedNew, config.path);
      const defaultValue = config.default;

      if (newVal !== undefined) {
        const fused = fuseDimension(oldVal, newVal, config, weightOld, weightNew, defaultValue);
        setNestedValue(fusedVector, config.path, fused);
      } else if (oldVal !== undefined) {
        setNestedValue(fusedVector, config.path, oldVal);
      }
    }

    // 更新样本数
    const newSampleCount = sampleCount + 1;

    // 检测变更
    const changedDimensions = detectChanges(oldVector, fusedVector);

    // 更新方差
    const updatedVariance = updateVariance(stats, oldVector, fusedVector, newSampleCount);

    // 计算置信度
    const confidence = calculateConfidence(newSampleCount, updatedVariance);

    // 更新画像
    const updatedProfile = {
      style_vector: fusedVector,
      sample_count: newSampleCount,
      last_updated: new Date().toISOString(),
      confidence: confidence
    };

    // 更新统计信息
    const updatedStats = {
      total_samples: newSampleCount,
      dimension_variance: updatedVariance,
      confidence: confidence
    };

    // 事务性保存
    saveProfileAndStats(updatedProfile, updatedStats);

    // 返回结果
    return {
      status: changedDimensions.length > 0 ? 'updated' : 'no_change',
      payload: {
        changed_dimensions: changedDimensions,
        confidence: confidence,
        sample_count: newSampleCount
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 提取主导特征（配置驱动）
 * @param {Object} styleVector - 风格向量
 * @returns {Object} 主导特征对象
 */
function extractDominantTraits(styleVector) {
  if (!styleVector || typeof styleVector !== 'object') {
    return {};
  }

  const dominantTraits = {};

  // 辅助函数：将数值转换为 low/medium/high
  const numericToLevel = (value) => {
    if (value === undefined || value === null) return undefined;
    return value < 0.3 ? 'low' : value < 0.7 ? 'medium' : 'high';
  };

  // 辅助函数：从分布中找到最大值对应的 key
  const getMaxKeyFromDistribution = (dist) => {
    if (!dist || typeof dist !== 'object') return undefined;
    const keys = Object.keys(dist);
    if (keys.length === 0) return undefined;
    return keys.reduce((a, b) => dist[a] > dist[b] ? a : b);
  };

  // 遍历所有维度配置
  for (const [dimName, config] of Object.entries(DIMENSION_CONFIG)) {
    if (config.type === 'nested') {
      // 嵌套维度：提取子维度的主导特征
      const nestedValue = getNestedValue(styleVector, config.path);
      if (nestedValue) {
        const nestedTraits = {};
        
        for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
          const fieldValue = getNestedValue(styleVector, fieldConfig.path);
          
          if (fieldValue !== undefined && fieldValue !== null) {
            if (fieldConfig.type === 'distribution') {
              const maxKey = getMaxKeyFromDistribution(fieldValue);
              if (maxKey !== undefined) {
                nestedTraits[fieldName] = maxKey;
              }
            } else if (fieldConfig.type === 'numeric') {
              nestedTraits[fieldName] = numericToLevel(fieldValue);
            } else if (fieldConfig.type === 'categorical') {
              nestedTraits[fieldName] = fieldValue;
            }
          }
        }
        
        if (Object.keys(nestedTraits).length > 0) {
          dominantTraits[dimName] = nestedTraits;
        }
      }
    } else {
      // 基础维度
      const value = getNestedValue(styleVector, config.path);
      
      if (value !== undefined && value !== null) {
        if (config.type === 'distribution') {
          const maxKey = getMaxKeyFromDistribution(value);
          if (maxKey !== undefined) {
            // 特殊处理：sentence_length 的 medium 转换为 medium-heavy
            dominantTraits[dimName] = (dimName === 'sentence_length' && maxKey === 'medium') 
              ? 'medium-heavy' 
              : maxKey;
          }
        } else if (config.type === 'numeric') {
          dominantTraits[dimName] = numericToLevel(value);
        } else if (config.type === 'categorical') {
          dominantTraits[dimName] = value;
        }
      }
    }
  }

  return dominantTraits;
}

/**
 * 获取当前风格画像
 */
function getProfile() {
  try {
    const profile = loadProfile();

    // 提取主导特征（使用配置驱动方式）
    const dominantTraits = extractDominantTraits(profile.style_vector || {});

    return {
      status: 'ok',
      payload: {
        dominant_traits: dominantTraits,
        style_vector: profile.style_vector,
        confidence: profile.confidence,
        sample_count: profile.sample_count
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 格式化风格向量为 markdown prompt
 * @param {Object} styleVector - 风格向量
 * @param {string} topic - 可选的主题
 * @returns {string} markdown 格式的 prompt
 */
function formatStylePrompt(styleVector, topic = '') {
  if (!styleVector || typeof styleVector !== 'object') {
    return '';
  }

  const lines = [];
  lines.push('请以以下写作风格撰写文章：');
  lines.push('');

  // 辅助函数：格式化分布类维度
  const formatDistribution = (dist, labels) => {
    if (!dist || typeof dist !== 'object') return '';
    
    const items = [];
    // 百分比保留1位小数
    const sorted = Object.entries(dist)
      .map(([key, value]) => ({ key, value: roundToPrecision(value * 100, 1) }))
      .sort((a, b) => b.value - a.value)
      .filter(item => item.value > 0);
    
    if (sorted.length === 0) return '';
    
    const main = sorted[0];
    const mainLabel = labels[main.key] || main.key;
    items.push(`${mainLabel}为主（${main.value}%）`);
    
    if (sorted.length > 1) {
      const others = sorted.slice(1).map(item => {
        const label = labels[item.key] || item.key;
        return `${label}（${item.value}%）`;
      });
      items.push(`结合${others.join('、')}`);
    }
    
    return items.join('，');
  };

  // 辅助函数：格式化数值为描述
  const formatNumericLevel = (value, labels) => {
    if (value === undefined || value === null) return '';
    const level = value < 0.3 ? 'low' : value < 0.7 ? 'medium' : 'high';
    const label = labels[level] || level;
    return `${label}（${roundToPrecision(value)}）`;
  };

  // 1. 句式特征
  if (styleVector.sentence_length) {
    const labels = { short: '短句', medium: '中句', long: '长句' };
    const formatted = formatDistribution(styleVector.sentence_length, labels);
    if (formatted) {
      lines.push(`**句式特征**：${formatted}`);
    }
  }

  // 2. 思维方式
  if (styleVector.logic_pattern) {
    const labels = {
      deductive: '演绎推理',
      inductive: '归纳推理',
      contrast: '对比分析',
      narrative: '叙事性'
    };
    const formatted = formatDistribution(styleVector.logic_pattern, labels);
    if (formatted) {
      lines.push(`**思维方式**：${formatted}`);
    }
  }

  // 3. 情感表达
  if (styleVector.emotion_intensity !== undefined) {
    const labels = { low: '情感强度低', medium: '情感强度中等', high: '情感强度高' };
    const formatted = formatNumericLevel(styleVector.emotion_intensity, labels);
    if (formatted) {
      const intensity = styleVector.emotion_intensity;
      let advice = '';
      if (intensity < 0.3) {
        advice = '，保持克制、理性';
      } else if (intensity < 0.7) {
        advice = '，适度表达情感';
      } else {
        advice = '，可以表达强烈情感';
      }
      lines.push(`**情感表达**：${formatted}${advice}`);
    }
  }

  // 4. 词汇水平
  if (styleVector.vocabulary_level) {
    const labels = {
      casual: '日常用语，简单直接',
      professional: '专业术语适中，平衡易懂和专业',
      academic: '学术化表达，术语密集'
    };
    const label = labels[styleVector.vocabulary_level] || styleVector.vocabulary_level;
    lines.push(`**词汇水平**：${label}`);
  }

  // 5. 结构偏好
  if (styleVector.structure_preference) {
    const labels = {
      linear: '线性结构，按顺序展开',
      hierarchical: '层次分明，使用清晰的标题层级',
      nested: '嵌套结构，多层级嵌套'
    };
    const label = labels[styleVector.structure_preference] || styleVector.structure_preference;
    lines.push(`**结构偏好**：${label}`);
    
    // 添加开头和结尾风格
    if (styleVector.opening_style) {
      const openingLabels = {
        question: '以问题开头',
        statement: '以陈述句开头',
        context: '先界定问题',
        direct: '直接切入主题'
      };
      const openingLabel = openingLabels[styleVector.opening_style] || styleVector.opening_style;
      lines.push(`- 开头：${openingLabel}`);
    }
    
    if (styleVector.closing_style) {
      const closingLabels = {
        summary: '总结结构而非情绪',
        reflection: '反思或展望',
        call_to_action: '行动号召',
        open: '开放式结尾，留下思考'
      };
      const closingLabel = closingLabels[styleVector.closing_style] || styleVector.closing_style;
      lines.push(`- 结尾：${closingLabel}`);
    }
  }

  // 6. 语气和语调
  if (styleVector.tone_and_voice) {
    const tv = styleVector.tone_and_voice;
    const parts = [];
    
    if (tv.formality !== undefined) {
      const formalityLabels = { low: '低正式', medium: '中等正式', high: '高正式' };
      const formalityLevel = tv.formality < 0.3 ? 'low' : tv.formality < 0.7 ? 'medium' : 'high';
      parts.push(`${formalityLabels[formalityLevel]}（${roundToPrecision(tv.formality)}）`);
    }
    
    if (tv.person_usage) {
      const personLabels = {
        first_person: '第一人称',
        second_person: '第二人称',
        third_person: '第三人称',
        neutral: '中性表达'
      };
      const sorted = Object.entries(tv.person_usage)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value)
        .filter(item => item.value > 0.25) // 只显示占比 > 25% 的人称
        .slice(0, 2) // 最多显示前两个
        .map(item => personLabels[item.key] || item.key);
      if (sorted.length > 0) {
        if (sorted.length === 1) {
          parts.push(`${sorted[0]}为主`);
        } else {
          parts.push(`${sorted.join('和')}混合使用`);
        }
      }
    }
    
    if (tv.voice_preference) {
      const voiceLabels = {
        active: '主动语态为主',
        passive: '被动语态为主',
        mixed: '混合语态'
      };
      const voiceLabel = voiceLabels[tv.voice_preference] || tv.voice_preference;
      parts.push(voiceLabel);
    }
    
    if (parts.length > 0) {
      lines.push(`**语气和语调**：${parts.join('，')}`);
    }
  }

  // 7. 信息密度
  if (styleVector.information_density) {
    const id = styleVector.information_density;
    const parts = [];
    
    if (id.density_level !== undefined) {
      const densityLabels = { low: '低密度', medium: '中等密度', high: '高密度' };
      const densityLevel = id.density_level < 0.3 ? 'low' : id.density_level < 0.7 ? 'medium' : 'high';
      parts.push(`${densityLabels[densityLevel]}（${roundToPrecision(id.density_level)}）`);
    }
    
    if (id.detail_level) {
      const detailLabels = {
        overview: '概览性',
        moderate: '中等详细程度',
        detailed: '详细',
        comprehensive: '全面'
      };
      const detailLabel = detailLabels[id.detail_level] || id.detail_level;
      parts.push(detailLabel);
    }
    
    if (parts.length > 0) {
      lines.push(`**信息密度**：${parts.join('，')}`);
    }
  }

  // 8. 交互性
  if (styleVector.interactivity) {
    const inter = styleVector.interactivity;
    const parts = [];
    
    if (inter.interaction_style) {
      const styleLabels = {
        question: '问题引导',
        directive: '指令式',
        narrative: '叙事性',
        dialogue: '对话式'
      };
      const sorted = Object.entries(inter.interaction_style)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value)
        .filter(item => item.value > 0.2)
        .map(item => styleLabels[item.key] || item.key);
      if (sorted.length > 0) {
        parts.push(`${sorted[0]}为主`);
      }
    }
    
    if (inter.supporting_elements) {
      const elementLabels = {
        examples: '示例',
        code: '代码',
        diagrams: '图表',
        none: '无额外支持元素'
      };
      const sorted = Object.entries(inter.supporting_elements)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value)
        .filter(item => item.value > 0.2 && item.key !== 'none')
        .map(item => elementLabels[item.key] || item.key);
      if (sorted.length > 0) {
        parts.push(`${sorted.join('和')}支持为主`);
      }
    }
    
    if (parts.length > 0) {
      lines.push(`**交互性**：${parts.join('，')}`);
    }
  }

  // 9. 主题
  if (topic && topic.trim()) {
    lines.push('');
    lines.push(`**主题**：${topic.trim()}`);
  }

  return lines.join('\n');
}

/**
 * 生成风格化写作 prompt
 * @param {string} topic - 可选的主题
 * @returns {Object} { status: 'ok'|'error', payload?: { prompt: string }, error?: string }
 */
function generatePrompt(topic = '') {
  try {
    const profileResult = getProfile();
    
    if (profileResult.status === 'error') {
      return {
        status: 'error',
        error: profileResult.error
      };
    }
    
    if (profileResult.payload.sample_count === 0) {
      return {
        status: 'error',
        error: '风格画像不存在或样本数为 0，请先使用 style-fusion 分析项目文档生成风格画像'
      };
    }
    
    const styleVector = profileResult.payload.style_vector;
    const prompt = formatStylePrompt(styleVector, topic);
    
    return {
      status: 'ok',
      payload: {
        prompt: prompt
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// 导出函数
module.exports = {
  fuseStyle,
  getProfile,
  generatePrompt,
  loadProfile,
  normalizeStyleVector,
  validateStyleVector,
  roundObjectValues
};

// 如果直接运行，执行测试
if (require.main === module) {
  console.log('Style Fusion Engine Test');
  console.log('=======================');
  
  // 测试融合 - 包含所有10个维度
  const testVector = {
    sentence_length: { short: 0.2, medium: 0.6, long: 0.2 },
    logic_pattern: { deductive: 0.6, inductive: 0.1, contrast: 0.3, narrative: 0.0 },
    emotion_intensity: 0.22,
    vocabulary_level: 'professional',
    structure_preference: 'hierarchical',
    opening_style: 'context',
    closing_style: 'summary',
    tone_and_voice: {
      formality: 0.6,
      person_usage: { first_person: 0.3, second_person: 0.2, third_person: 0.3, neutral: 0.2 },
      voice_preference: 'active'
    },
    information_density: {
      density_level: 0.65,
      detail_level: 'moderate'
    },
    interactivity: {
      interaction_style: { question: 0.2, directive: 0.4, narrative: 0.3, dialogue: 0.1 },
      supporting_elements: { examples: 0.4, code: 0.3, diagrams: 0.2, none: 0.1 }
    }
  };

  console.log('\n1. Testing input validation...');
  try {
    validateStyleVector(testVector);
    console.log('✓ Input validation passed');
  } catch (error) {
    console.error('✗ Input validation failed:', error.message);
  }

  console.log('\n2. Testing style fusion...');
  const result = fuseStyle(testVector);
  if (result.status === 'error') {
    console.error('✗ Fusion failed:', result.error);
  } else {
    console.log('✓ Fusion succeeded');
    console.log('Result:', JSON.stringify(result, null, 2));
  }

  console.log('\n3. Getting profile...');
  const profile = getProfile();
  if (profile.status === 'error') {
    console.error('✗ Get profile failed:', profile.error);
  } else {
    console.log('✓ Get profile succeeded');
    
    // 验证 dominant_traits 的完整性（应该包含所有 10 个维度）
    const dominantTraits = profile.payload.dominant_traits;
    const expectedDimensions = [
      'sentence_length',
      'logic_pattern',
      'emotion_intensity',
      'vocabulary_level',
      'structure_preference',
      'opening_style',
      'closing_style',
      'tone_and_voice',
      'information_density',
      'interactivity'
    ];
    
    const missingDimensions = expectedDimensions.filter(dim => {
      if (dim === 'tone_and_voice' || dim === 'information_density' || dim === 'interactivity') {
        // 嵌套维度，检查是否有子字段
        return !dominantTraits[dim] || Object.keys(dominantTraits[dim]).length === 0;
      }
      return !(dim in dominantTraits);
    });
    
    if (missingDimensions.length === 0) {
      console.log('✓ Dominant traits completeness check passed (all 10 dimensions present)');
    } else {
      console.warn(`⚠ Dominant traits missing dimensions: ${missingDimensions.join(', ')}`);
    }
    
    console.log('Dominant traits:', JSON.stringify(dominantTraits, null, 2));
  }

  console.log('\n4. Testing generatePrompt...');
  const promptResult = generatePrompt('解释滑动窗口算法');
  if (promptResult.status === 'error') {
    console.error('✗ Generate prompt failed:', promptResult.error);
  } else {
    console.log('✓ Generate prompt succeeded');
    console.log('Generated prompt:');
    console.log(promptResult.payload.prompt);
  }

  console.log('\n5. Testing generatePrompt without topic...');
  const promptResultNoTopic = generatePrompt();
  if (promptResultNoTopic.status === 'error') {
    console.error('✗ Generate prompt (no topic) failed:', promptResultNoTopic.error);
  } else {
    console.log('✓ Generate prompt (no topic) succeeded');
    console.log('Generated prompt (first 200 chars):');
    console.log(promptResultNoTopic.payload.prompt.substring(0, 200) + '...');
  }

  console.log('\n6. Testing error handling...');
  const invalidVector = { invalid: 'data' };
  const errorResult = fuseStyle(invalidVector);
  if (errorResult.status === 'error') {
    console.log('✓ Error handling works:', errorResult.error);
  } else {
    console.error('✗ Error handling failed: should have returned error');
  }
}
