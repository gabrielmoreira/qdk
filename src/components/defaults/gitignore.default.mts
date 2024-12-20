export const gitignoreDefault = `
### Node.js Standard ###
# Logs generated by Node.js and related tools
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data files (PID files, seeds, locks)
pids
*.pid
*.seed
*.pid.lock

# Dependency directories (Node.js and package managers)
node_modules/
jspm_packages/
web_modules/ # Snowpack (https://snowpack.dev/)

# Build outputs and binary addons (https://nodejs.org/api/addons.html)
build/Release
.lock-wscript

# Coverage files used by testing tools like Istanbul/nyc
coverage/
*.lcov
.nyc_output

# Cache directories
.npm
.cache
.parcel-cache # Parcel (https://parceljs.org/)
.eslintcache # ESLint
.stylelintcache # Stylelint
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# TypeScript cache
*.tsbuildinfo

# Yarn Integrity file
.yarn-integrity

# REPL history
.node_repl_history

# Output from 'npm pack'
*.tgz

### Environment Variables ###
# dotenv environment variable files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

### Framework-specific Build Outputs ###
# Next.js (https://nextjs.org/)
.next/
out/

# Nuxt.js (https://nuxtjs.org/)
.nuxt/
dist/

# Gatsby (https://gatsbyjs.com/)
.cache/
# public/ # Uncomment if using Gatsby instead of Next.js

# SvelteKit (https://kit.svelte.dev/)
.svelte-kit/

# VuePress (https://vuepress.vuejs.org/)
.vuepress/dist/
.temp/ # VuePress v2.x cache

# Docusaurus (https://docusaurus.io/)
.docusaurus/

# Serverless Framework (https://www.serverless.com/)
.serverless/

# FuseBox (https://fuse-box.org/)
.fusebox/

# DynamoDB Local (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
.dynamodb/

# Serverless Webpack directories
.webpack/

### Development Tools ###
# VSCode
.vscode-test

# Yarn v2 (https://yarnpkg.com/getting-started/migration)
.yarn/cache/
.yarn/unplugged/
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

### macOS ###
# macOS Finder and Spotlight files
.DS_Store

### Xcode (https://developer.apple.com/xcode/) ###
# Xcode-specific files and directories
build/
*.pbxuser
*.mode1v3
*.mode2v3
*.perspectivev3
xcuserdata/
*.xccheckout
*.moved-aside
DerivedData/
*.hmap
*.ipa
*.xcuserstate
**/.xcode.env.local

### Android/IntelliJ (https://developer.android.com/studio) ###
# Android Studio/IntelliJ project files
build/
.idea/
.gradle/
local.properties
*.iml
*.hprof
.cxx/
*.keystore
!debug.keystore

### Mobile Development ###
# Fastlane (https://docs.fastlane.tools/best-practices/source-control/)
**/fastlane/report.xml
**/fastlane/Preview.html
**/fastlane/screenshots/
**/fastlane/test_output/

# Metro (React Native) health check file
.metro-health-check*

# Bundle artifacts for mobile platforms
*.jsbundle

### Ruby/CocoaPods (https://guides.cocoapods.org/) ###
# Pods and vendor directories
**/Pods/
**/vendor/bundle/

### Testing ###
# Coverage reports and testing output
/coverage/

### Other ###
# TernJS (https://ternjs.net/)
.tern-port

# Eclipse (https://www.eclipse.org/)
.metadata/
tmp/

# BUCK (https://buck.build/)
buck-out/
.buckd/
android/app/libs/
android/keystores/debug.keystore

# Expo (https://expo.dev/)
.expo/

# Turborepo (https://turborepo.org/)
.turbo/

# React Native Codegen
ios/generated/
android/generated/

# Generated by react native bob builder
# lib/
`.split('\n');
