import * as childProcess from 'child_process';
import { EventEmitter } from 'events';
import { cpus } from 'os';
import * as path from 'path';
import { Message } from './types/message';
import { Options } from './types/options';
import { Promise } from './globals/promise';
import { Reporter } from './types/reporter';
import { TestResult } from './types/test-result';

export class Beater extends EventEmitter {
  private reporter: Reporter;
  private procs: number;
  private files: string[];
  private pendingFiles: string[];
  private finishedFiles: string[];
  private requires: string[];
  private fileResults: { [file: string]: TestResult[]; };

  constructor(options: Options) {
    super();
    this.reporter = options.reporter;
    this.files = options.files;
    this.pendingFiles = this.files.slice();
    this.finishedFiles = [];
    this.procs = options.procs || cpus().length;
    this.requires = options.requires || [];
    this.fileResults = {};
    this.on('next', this.nextFile.bind(this));
  }

  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.once('finish', (hasError: boolean) => {
        (hasError ? reject : resolve)();
      });
      this.reporter.started();
      this.pendingFiles
        .splice(0, this.procs)
        .forEach(file => this.emit('next', file));
    });
  }

  private nextFile(file: string): void {
    this.fileResults[file] = [];
    const args = this.requires.reduce((requires, require) => requires.concat([
      '--require', require
    ]), []);
    const cp = childProcess.fork(file, [], { execArgv: args });
    cp.on('message', (m: Message) => {
      if (m.type === 'report-test-started') {
        this.reporter.testStarted(m.test);
      } else if (m.type === 'report-test-finished') {
        this.fileResults[file].push(m.result);
        this.reporter.testFinished(m.result);
      } else if (m.type === 'error') {
        // FIXME:
      }
    });
    cp.on('close', () => {
      this.finishedFiles.push(file);
      if (this.pendingFiles.length > 0) {
        this.emit('next', this.pendingFiles.shift());
      } else if (this.finishedFiles.length === this.files.length) {
        this.reporter.finished(
          Object.keys(this.fileResults).reduce((results, file) => {
            return results.concat(this.fileResults[file]);
          }, [])
        );
        const hasError = Object
          .keys(this.fileResults)
          .some(file => this.fileResults[file].length > 0);
        this.emit('finish', hasError);
      } else {
        // do nothing
      }
    });
  }
}
