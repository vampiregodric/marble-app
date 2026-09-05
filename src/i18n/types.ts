import { pt } from './pt';

// O português é a forma de referência: o inglês (en.ts) tem de ter as
// mesmas chaves com os mesmos tipos, senão o typecheck falha.
export type Strings = typeof pt;
