import { ConfigFileOptions } from './config-file-options';

export interface CommandLineOptions extends ConfigFileOptions {
  help?: boolean;
  version?: string;
}
