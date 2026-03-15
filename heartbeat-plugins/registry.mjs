#!/usr/bin/env node
/**
 * 心跳插件注册表：声明参与心跳的插件及顺序，供 heartbeat-check 加载。
 * 新增插件：1）在目录下新增 xxx.mjs 并 default 导出契约；2）在此 import 并加入 PLUGINS 数组。
 */
import sessionDistill from "./session-distill.mjs";
import selfIterate from "./self-iterate.mjs";

const PLUGINS = [sessionDistill, selfIterate];

export function getRegisteredApps() {
  return PLUGINS;
}
