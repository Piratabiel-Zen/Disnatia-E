import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Every build begins from the same seeds. Legacy patches may mutate only this
// disposable workspace, never the versioned source used by the following build.
export function prepareBuild(steps) {
  const root=process.cwd();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dinastia-build-'));
  try {
    for(const name of ['App.jsx','scripts','src','public'])fs.cpSync(path.join(root,name),path.join(temp,name),{recursive:true});
    for(const script of steps)execFileSync(process.execPath,[script],{cwd:temp,stdio:'inherit'});
    const output=path.join(root,'.generated');
    fs.mkdirSync(output,{recursive:true});
    fs.cpSync(path.join(temp,'src'),path.join(output,'src'),{recursive:true});
    fs.copyFileSync(path.join(temp,'public','media','deserto-bg.mp4'),path.join(root,'public','media','deserto-bg.mp4'));
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
