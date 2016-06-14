import { Reporter } from './reporter';

export interface Options {
  files: string[];
  procs?: number;
  reporter: Reporter;
  requires?: string[];
}
