/* eslint-disable @typescript-eslint/unbound-method */
import { fs } from 'memfs';
export default fs;
export const {
  access,
  accessSync,
  appendFile,
  appendFileSync,
  chmod,
  chmodSync,
  chown,
  chownSync,
  close,
  closeSync,
  constants,
  copyFile,
  copyFileSync,
  cp,
  cpSync,
  createLink,
  createNode,
  createReadStream,
  createWriteStream,
  deleteLink,
  Dirent,
  exists,
  existsSync,
  fchmod,
  fchmodSync,
  fchown,
  fchownSync,
  fdatasync,
  fdatasyncSync,
  fds,
  fromJSON,
  fromNestedJSON,
  fstat,
  fstatSync,
  FSWatcher,
  fsync,
  fsyncSync,
  ftruncate,
  ftruncateSync,
  futimes,
  futimesSync,
  getLink,
  getLinkOrThrow,
  getResolvedLink,
  getResolvedLinkOrThrow,
  ino,
  inodes,
  lchmod,
  lchmodSync,
  lchown,
  lchownSync,
  link,
  linkSync,
  lstat,
  lstatSync,
  lutimes,
  lutimesSync,
  maxFiles,
  mkdir,
  mkdirSync,
  mkdtemp,
  mkdtempSync,
  mountSync,
  open,
  openAsBlob,
  opendir,
  opendirSync,
  openFiles,
  openSync,
  promises,
  props,
  read,
  readdir,
  readdirSync,
  readFile,
  readFileSync,
  readlink,
  readlinkSync,
  ReadStream,
  readSync,
  readv,
  readvSync,
  realpath,
  realpathSync,
  releasedFds,
  releasedInos,
  rename,
  renameSync,
  reset,
  resolveSymlinks,
  rm,
  rmdir,
  rmdirSync,
  rmSync,
  root,
  stat,
  statfs,
  statfsSync,
  Stats,
  statSync,
  StatWatcher,
  symlink,
  symlinkSync,
  toJSON,
  toTree,
  truncate,
  truncateSync,
  unlink,
  unlinkSync,
  unwatchFile,
  utimes,
  utimesSync,
  watch,
  watchFile,
  write,
  writeFile,
  writeFileSync,
  WriteStream,
  writeSync,
  writev,
  writevSync,
} = fs;
