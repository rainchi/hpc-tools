
export const OSU_CATEGORIES = {
  pt2pt: {
    label: 'Point-to-Point (點對點)',
    benchmarks: [
      { value: 'osu_latency', label: 'Latency (延遲)' },
      { value: 'osu_bandwidth', label: 'Bandwidth (頻寬)' },
      { value: 'osu_bibw', label: 'Bidirectional Bandwidth (雙向頻寬)' },
      { value: 'osu_multi_lat', label: 'Multi-Latency' },
    ]
  },
  collective: {
    label: 'Collective (集體通訊)',
    benchmarks: [
      { value: 'osu_allreduce', label: 'Allreduce' },
      { value: 'osu_reduce', label: 'Reduce' },
      { value: 'osu_alltoall', label: 'Alltoall' },
      { value: 'osu_bcast', label: 'Broadcast' },
      { value: 'osu_barrier', label: 'Barrier' },
      { value: 'osu_gather', label: 'Gather' },
      { value: 'osu_scatter', label: 'Scatter' },
      { value: 'osu_allgather', label: 'Allgather' },
    ]
  },
  one_sided: {
    label: 'One-Sided (單邊通訊)',
    benchmarks: [
      { value: 'osu_put_latency', label: 'Put Latency' },
      { value: 'osu_get_latency', label: 'Get Latency' },
      { value: 'osu_put_bw', label: 'Put Bandwidth' },
      { value: 'osu_get_bw', label: 'Get Bandwidth' },
    ]
  }
};

export const buildOsuCmd = (config) => {
  const { category, benchmark, device, mpiPath } = config;
  
  let executable = benchmark;
  
  // Path to OSU benchmark
  let fullPath = executable;
  if (mpiPath) {
    fullPath = `${mpiPath.replace(/\/$/, '')}/${category}/${executable}`;
  }

  let cmd = fullPath;

  // Device options
  if (device === 'cuda') {
    cmd += ` -d cuda`;
  } else if (device === 'rocm') {
    cmd += ` -d rocm`;
  }

  return cmd;
};
