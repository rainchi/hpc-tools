/**
 * STREAM Benchmark Utility
 */

export const STREAM_DEFAULTS = {
  arraySize: 10000000, // 10M elements
  ntimes: 10,
  offset: 0,
  type: 'double',
  openmp: true,
  numThreads: 1,
  compiler: 'gcc',
  optimization: '-O3',
  march: 'native'
};

/**
 * Build compilation command for STREAM
 */
export function buildStreamCompileCmd(config) {
  const { arraySize, ntimes, offset, type, openmp, compiler, optimization, march } = config;
  
  let cmd = `${compiler} ${optimization} ${march}`;
  
  if (openmp) {
    cmd += ' -fopenmp';
  }
  
  cmd += ` -DSTREAM_ARRAY_SIZE=${arraySize}`;
  cmd += ` -DNTIMES=${ntimes}`;
  if (offset > 0) cmd += ` -DOFFSET=${offset}`;
  if (type === 'float') cmd += ` -DSTREAM_TYPE=float`;
  
  cmd += ` stream.c -o stream`;
  
  return cmd;
}

/**
 * Build execution command for STREAM
 */
export function buildStreamRunCmd(config) {
  const { openmp, numThreads } = config;
  
  if (openmp) {
    return `OMP_NUM_THREADS=${numThreads} ./stream`;
  }
  
  return `./stream`;
}
