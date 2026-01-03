/**
 * FIO (Flexible I/O Tester) Utility
 */

export const FIO_TEMPLATES = [
  {
    id: 'seq_read',
    label: 'Sequential Read (Throughput)',
    config: { rw: 'read', bs: '1M', iodepth: 16, direct: 1 }
  },
  {
    id: 'seq_write',
    label: 'Sequential Write (Throughput)',
    config: { rw: 'write', bs: '1M', iodepth: 16, direct: 1 }
  },
  {
    id: 'rand_read',
    label: 'Random Read (IOPS)',
    config: { rw: 'randread', bs: '4k', iodepth: 32, direct: 1 }
  },
  {
    id: 'rand_write',
    label: 'Random Write (IOPS)',
    config: { rw: 'randwrite', bs: '4k', iodepth: 32, direct: 1 }
  }
];

export const FIO_DEFAULTS = {
  name: 'mytest',
  filename: 'testfile',
  rw: 'read',
  bs: '4k',
  size: '1G',
  numjobs: 1,
  iodepth: 1,
  runtime: 60,
  direct: 1,
  ioengine: 'libaio',
  group_reporting: true
};

/**
 * Build FIO command
 */
export function buildFioCmd(config) {
  let cmd = `fio --name=${config.name}`;
  cmd += ` --filename=${config.filename}`;
  cmd += ` --rw=${config.rw}`;
  cmd += ` --bs=${config.bs}`;
  cmd += ` --size=${config.size}`;
  cmd += ` --numjobs=${config.numjobs}`;
  cmd += ` --iodepth=${config.iodepth}`;
  cmd += ` --runtime=${config.runtime}`;
  cmd += ` --time_based`;
  cmd += ` --direct=${config.direct}`;
  cmd += ` --ioengine=${config.ioengine}`;
  
  if (config.group_reporting) {
    cmd += ` --group_reporting`;
  }
  
  return cmd;
}
