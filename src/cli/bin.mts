#!/usr/bin/env -S node
import { tsImport } from 'tsx/esm/api';
await tsImport('./index.mjs', { parentURL: import.meta.url });
