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

/**
 * 初始化风格画像目录和文件
 */
function initializeStyleDir() {
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
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(initialProfile, null, 2));
  }

  if (!fs.existsSync(STATS_FILE)) {
    const initialStats = {
      total_samples: 0,
      dimension_variance: {},
      confidence: 0
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2));
  }
}

/**
 * 加载当前风格画像
 */
function loadProfile() {
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
  return JSON.parse(content);
}

/**
 * 加载统计信息
 */
function loadStats() {
  initializeStyleDir();
  
  if (!fs.existsSync(STATS_FILE)) {
    return {
      total_samples: 0,
      dimension_variance: {},
      confidence: 0
    };
  }

  const content = fs.readFileSync(STATS_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * 保存风格画像
 */
function saveProfile(profile) {
  initializeStyleDir();
  profile.last_updated = new Date().toISOString();
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
}

/**
 * 保存统计信息
 */
function saveStats(stats) {
  initializeStyleDir();
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

/**
 * 标准化风格向量
 * 确保分布类维度的总和为 1.0
 */
function normalizeStyleVector(styleVector) {
  const normalized = { ...styleVector };

  // 标准化 sentence_length
  if (normalized.sentence_length) {
    const sum = Object.values(normalized.sentence_length).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      Object.keys(normalized.sentence_length).forEach(key => {
        normalized.sentence_length[key] /= sum;
      });
    }
  }

  // 标准化 logic_pattern
  if (normalized.logic_pattern) {
    const sum = Object.values(normalized.logic_pattern).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      Object.keys(normalized.logic_pattern).forEach(key => {
        normalized.logic_pattern[key] /= sum;
      });
    }
  }

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
      fused[key] /= sum;
    });
  }

  return fused;
}

/**
 * 融合数值类维度（如 emotion_intensity）
 */
function fuseNumeric(oldValue, newValue, weightOld, weightNew) {
  return weightOld * (oldValue || 0) + weightNew * (newValue || 0);
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
 * 计算置信度
 * 基于样本数和维度稳定性
 */
function calculateConfidence(sampleCount, dimensionVariance) {
  // 基础置信度：随样本数增长，但增长递减
  const baseConfidence = 1 - Math.exp(-sampleCount / 10);
  
  // 方差惩罚：方差越大，置信度越低
  const variancePenalty = Object.values(dimensionVariance).reduce((sum, v) => sum + v, 0) / 
                          Math.max(Object.keys(dimensionVariance).length, 1);
  const varianceFactor = Math.max(0, 1 - variancePenalty);
  
  return Math.min(1.0, baseConfidence * varianceFactor);
}

/**
 * 检测变更维度
 * 比较新旧风格向量，找出变化超过阈值的维度
 */
function detectChanges(oldVector, newVector, threshold = 0.1) {
  const changes = [];

  // 检查分布类维度
  ['sentence_length', 'logic_pattern'].forEach(dim => {
    if (!oldVector[dim] || !newVector[dim]) {
      if (oldVector[dim] !== newVector[dim]) {
        changes.push(dim);
      }
      return;
    }

    const oldKeys = Object.keys(oldVector[dim]);
    const newKeys = Object.keys(newVector[dim]);
    const allKeys = new Set([...oldKeys, ...newKeys]);

    for (const key of allKeys) {
      const oldVal = oldVector[dim][key] || 0;
      const newVal = newVector[dim][key] || 0;
      if (Math.abs(oldVal - newVal) > threshold) {
        changes.push(dim);
        break;
      }
    }
  });

  // 检查数值类维度
  ['emotion_intensity'].forEach(dim => {
    if (oldVector[dim] !== undefined && newVector[dim] !== undefined) {
      if (Math.abs(oldVector[dim] - newVector[dim]) > threshold) {
        changes.push(dim);
      }
    } else if (oldVector[dim] !== newVector[dim]) {
      changes.push(dim);
    }
  });

  // 检查分类类维度
  ['vocabulary_level', 'structure_preference', 'opening_style', 'closing_style'].forEach(dim => {
    if (oldVector[dim] !== newVector[dim]) {
      changes.push(dim);
    }
  });

  return [...new Set(changes)]; // 去重
}

/**
 * 更新维度方差（用于置信度计算）
 */
function updateVariance(stats, oldVector, newVector, sampleCount) {
  const variance = { ...stats.dimension_variance };

  // 对于数值类维度，计算方差
  ['emotion_intensity'].forEach(dim => {
    if (oldVector[dim] !== undefined && newVector[dim] !== undefined) {
      const diff = Math.abs(oldVector[dim] - newVector[dim]);
      if (!variance[dim]) {
        variance[dim] = 0;
      }
      // 使用指数移动平均更新方差估计
      const alpha = 1 / (sampleCount + 1);
      variance[dim] = (1 - alpha) * variance[dim] + alpha * diff * diff;
    }
  });

  return variance;
}

/**
 * 主融合函数
 * 
 * @param {Object} newStyleVector - 新提取的风格向量
 * @returns {Object} 融合结果 { status, payload }
 */
function fuseStyle(newStyleVector) {
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

  // 融合风格向量
  const fusedVector = {};

  // 融合分布类维度
  if (normalizedNew.sentence_length) {
    fusedVector.sentence_length = fuseDistribution(
      oldVector.sentence_length,
      normalizedNew.sentence_length,
      weightOld,
      weightNew
    );
  } else if (oldVector.sentence_length) {
    fusedVector.sentence_length = oldVector.sentence_length;
  }

  if (normalizedNew.logic_pattern) {
    fusedVector.logic_pattern = fuseDistribution(
      oldVector.logic_pattern,
      normalizedNew.logic_pattern,
      weightOld,
      weightNew
    );
  } else if (oldVector.logic_pattern) {
    fusedVector.logic_pattern = oldVector.logic_pattern;
  }

  // 融合数值类维度
  if (normalizedNew.emotion_intensity !== undefined) {
    fusedVector.emotion_intensity = fuseNumeric(
      oldVector.emotion_intensity,
      normalizedNew.emotion_intensity,
      weightOld,
      weightNew
    );
  } else if (oldVector.emotion_intensity !== undefined) {
    fusedVector.emotion_intensity = oldVector.emotion_intensity;
  }

  // 融合分类类维度
  ['vocabulary_level', 'structure_preference', 'opening_style', 'closing_style'].forEach(dim => {
    if (normalizedNew[dim] !== undefined) {
      fusedVector[dim] = fuseCategorical(
        oldVector[dim],
        normalizedNew[dim],
        weightOld,
        weightNew
      );
    } else if (oldVector[dim] !== undefined) {
      fusedVector[dim] = oldVector[dim];
    }
  });

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

  // 保存
  saveProfile(updatedProfile);
  saveStats(updatedStats);

  // 返回结果
  return {
    status: changedDimensions.length > 0 ? 'updated' : 'no_change',
    payload: {
      changed_dimensions: changedDimensions,
      confidence: confidence,
      sample_count: newSampleCount
    }
  };
}

/**
 * 获取当前风格画像
 */
function getProfile() {
  const profile = loadProfile();
  const stats = loadStats();

  // 提取主导特征
  const dominantTraits = {};
  
  if (profile.style_vector.sentence_length) {
    const sl = profile.style_vector.sentence_length;
    const maxKey = Object.keys(sl).reduce((a, b) => sl[a] > sl[b] ? a : b);
    dominantTraits.sentence_length = maxKey === 'medium' ? 'medium-heavy' : maxKey;
  }

  if (profile.style_vector.logic_pattern) {
    const lp = profile.style_vector.logic_pattern;
    const maxKey = Object.keys(lp).reduce((a, b) => lp[a] > lp[b] ? a : b);
    dominantTraits.logic_pattern = maxKey;
  }

  if (profile.style_vector.emotion_intensity !== undefined) {
    const ei = profile.style_vector.emotion_intensity;
    dominantTraits.emotion_intensity = ei < 0.3 ? 'low' : ei < 0.7 ? 'medium' : 'high';
  }

  return {
    status: 'ok',
    payload: {
      dominant_traits: dominantTraits,
      style_vector: profile.style_vector,
      confidence: profile.confidence,
      sample_count: profile.sample_count
    }
  };
}

// 导出函数
module.exports = {
  fuseStyle,
  getProfile,
  loadProfile,
  normalizeStyleVector
};

// 如果直接运行，执行测试
if (require.main === module) {
  console.log('Style Fusion Engine Test');
  console.log('=======================');
  
  // 测试融合
  const testVector = {
    sentence_length: { short: 0.2, medium: 0.6, long: 0.2 },
    logic_pattern: { deductive: 0.6, inductive: 0.1, contrast: 0.3, narrative: 0.0 },
    emotion_intensity: 0.22,
    vocabulary_level: 'professional',
    structure_preference: 'hierarchical',
    opening_style: 'context',
    closing_style: 'summary'
  };

  console.log('\n1. Testing style fusion...');
  const result = fuseStyle(testVector);
  console.log('Result:', JSON.stringify(result, null, 2));

  console.log('\n2. Getting profile...');
  const profile = getProfile();
  console.log('Profile:', JSON.stringify(profile, null, 2));
}
