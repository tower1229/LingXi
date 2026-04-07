#!/usr/bin/env node

import process from "node:process";
import { nextTaskId, resolveProjectRoot } from "../../../scripts/_lingxi-memory.mjs";

process.stdout.write(`${nextTaskId(resolveProjectRoot())}\n`);
