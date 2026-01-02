// Command and script builders for HPC Tools

export const joinEnv = (envStr) => (envStr || '').trim().split(/\s+/).filter(Boolean);

export const buildMpiCmd = (mpi, rankfileText) => {
  let cmd = `mpirun -np ${mpi.np}`;
  if (mpi.ppn) {
    if (mpi.type === 'openmpi') cmd += ` --map-by ppr:${mpi.ppn}:node`;
    else cmd += ` -ppn ${mpi.ppn}`;
  }
  if (mpi.hostfile) cmd += ` --hostfile ${mpi.hostfile}`;
  if (mpi.byNode) cmd += mpi.type === 'openmpi' ? ` --map-by node` : ` -bynode`;
  if (mpi.bindToCore) cmd += mpi.type === 'openmpi' ? ` --bind-to core` : ` -bind-to core`;
  if (mpi.showMap) {
    if (mpi.type === 'openmpi') cmd += ` --display-map`;
    else if (mpi.type === 'intel') cmd += ` -print-rank-map`;
    else cmd += ` -print-rank-map`;
  }
  const extras = joinEnv(mpi.envExtra);
  if (mpi.type === 'openmpi') {
    cmd += ` -x OMP_NUM_THREADS=${mpi.omp}`;
    extras.forEach((kv) => {
      cmd += ` -x ${kv}`;
    });
  } else if (mpi.type === 'intel') {
    cmd += ` -genv OMP_NUM_THREADS ${mpi.omp}`;
    extras.forEach((kv) => {
      const [k, v] = kv.split('=');
      cmd += ` -genv ${k} ${v ?? ''}`;
    });
  } else {
    cmd += ` -env OMP_NUM_THREADS ${mpi.omp}`;
    extras.forEach((kv) => {
      const [k, v] = kv.split('=');
      cmd += ` -env ${k} ${v ?? ''}`;
    });
  }
  if (mpi.type === 'openmpi' && rankfileText) cmd += ' --rankfile rankfile.txt';
  cmd += ` ${mpi.executable}`;
  return cmd.trim();
};

export const buildNvprofCmd = (nvprof) => {
  let cmd = `nvprof`;
  if (nvprof.output) cmd += ` -o ${nvprof.output}`;
  if (nvprof.printSummary) cmd += ` --print-summary`;
  if (nvprof.printGpuTrace) cmd += ` --print-gpu-trace`;
  cmd += ` ${nvprof.executable}`;
  return cmd;
};

export const buildNsysCmd = (nsys) => {
  let cmd = `nsys profile -o ${nsys.output}`;
  const traces = Array.isArray(nsys.selectedTraces) ? nsys.selectedTraces.filter(Boolean) : [];
  const traceStr = traces.length ? traces.join(',') : (nsys.trace || '').trim();
  if (traceStr) cmd += ` --trace=${traceStr}`;
  if (nsys.summary) cmd += ` --summary=true`;
  if (nsys.sample) cmd += ` --sample=cpu`;
  cmd += ` ${nsys.executable}`;
  return cmd;
};

export const buildNcuCmd = (ncu) => {
  let cmd = `ncu --export ${ncu.output}`;
  if (ncu.set) cmd += ` --set ${ncu.set}`;
  if (ncu.kernelRegex) cmd += ` --kernel-name-base demangled --kernel-name ${ncu.kernelRegex}`;
  cmd += ` ${ncu.executable}`;
  return cmd;
};

export const buildSlurmScript = (slurm, slurmAdv) => {
  const lines = [];
  lines.push('#!/bin/bash');
  if (slurm.jobName) lines.push(`#SBATCH --job-name=${slurm.jobName}`);
  if (slurm.partition) lines.push(`#SBATCH --partition=${slurm.partition}`);
  if (slurm.account) lines.push(`#SBATCH --account=${slurm.account}`);
  if (slurm.time) lines.push(`#SBATCH --time=${slurm.time}`);
  if (slurm.nodes) lines.push(`#SBATCH --nodes=${slurm.nodes}`);
  if (slurm.ntasksPerNode) lines.push(`#SBATCH --ntasks-per-node=${slurm.ntasksPerNode}`);
  if (slurm.gpusPerNode && slurm.gpusPerNode > 0) lines.push(`#SBATCH --gpus-per-node=${slurm.gpusPerNode}`);
  if (slurmAdv.mem) lines.push(`#SBATCH --mem=${slurmAdv.mem}`);
  if (slurmAdv.qos) lines.push(`#SBATCH --qos=${slurmAdv.qos}`);
  if (slurmAdv.gpuBind) lines.push(`#SBATCH --gpu-bind=${slurmAdv.gpuBind}`);
  if (slurmAdv.constraint) lines.push(`#SBATCH --constraint=${slurmAdv.constraint}`);
  if (slurmAdv.exclusive) lines.push(`#SBATCH --exclusive`);
  if (slurmAdv.profile) lines.push(`#SBATCH --profile`);
  lines.push(`#SBATCH --output=%x.%j.out`);
  lines.push(`#SBATCH --error=%x.%j.err`);
  lines.push('');
  const mods = (slurm.modules || '').trim().split(/\s+/).filter(Boolean);
  if (mods.length) {
    lines.push('module purge');
    mods.forEach((m) => lines.push(`module load ${m}`));
    lines.push('');
  }
  const envs = joinEnv(slurm.env);
  if (slurm.omp) lines.push(`export OMP_NUM_THREADS=${slurm.omp}`);
  envs.forEach((kv) => lines.push(`export ${kv}`));
  lines.push('');
  lines.push('echo "Start: $(date)"');
  lines.push(slurm.run);
  lines.push('echo "Done: $(date)"');
  return lines.join('\n');
};

export const buildSrunCmd = (slurm, slurmAdv) => {
  let cmd = 'srun';
  if (slurm.partition) cmd += ` --partition=${slurm.partition}`;
  if (slurm.account) cmd += ` --account=${slurm.account}`;
  if (slurm.time) cmd += ` --time=${slurm.time}`;
  if (slurm.nodes) cmd += ` --nodes=${slurm.nodes}`;
  if (slurm.ntasksPerNode) cmd += ` --ntasks-per-node=${slurm.ntasksPerNode}`;
  if (slurm.gpusPerNode && slurm.gpusPerNode > 0) cmd += ` --gpus-per-node=${slurm.gpusPerNode}`;
  if (slurmAdv.mem) cmd += ` --mem=${slurmAdv.mem}`;
  if (slurmAdv.qos) cmd += ` --qos=${slurmAdv.qos}`;
  if (slurmAdv.gpuBind) cmd += ` --gpu-bind=${slurmAdv.gpuBind}`;
  if (slurmAdv.constraint) cmd += ` --constraint=${slurmAdv.constraint}`;
  if (slurmAdv.exclusive) cmd += ` --exclusive`;
  
  const interactive = `${cmd} --pty /bin/bash`;
  const runCmd = `${cmd} ${slurm.run}`;
  
  return { interactive, runCmd };
};

export const buildArrayScript = (slurmArray) => {
  const lines = [];
  lines.push('#!/bin/bash');
  lines.push(`#SBATCH --array=${slurmArray.range}`);
  lines.push(`#SBATCH --output=${slurmArray.outFmt}`);
  lines.push(`#SBATCH --error=${slurmArray.errFmt}`);
  lines.push('');
  lines.push(slurmArray.run);
  return lines.join('\n');
};

export const buildTransferCmd = (transfer) => {
  if (transfer.useRsync) {
    let cmd = 'rsync';
    cmd += transfer.archive ? ' -aH' : ' -r';
    if (transfer.compress) cmd += ' -z';
    if (transfer.progress) cmd += ' --info=progress2';
    if (transfer.checksum) cmd += ' --checksum';
    if (transfer.delete) cmd += ' --delete';
    cmd += ` ${transfer.src} ${transfer.dst}`;
    return cmd;
  } else {
    let cmd = 'scp -r';
    if (transfer.progress) cmd += ' -v';
    cmd += ` ${transfer.src} ${transfer.dst}`;
    return cmd;
  }
};

export const buildModulesCmd = (modules) => {
  const loads = (modules.load || '').trim().split(/\s+/).filter(Boolean);
  const unloads = (modules.unload || '').trim().split(/\s+/).filter(Boolean);

  // Add selected modules from UI
  if (modules.selected && Array.isArray(modules.selected)) {
    modules.selected.forEach(m => {
      if (!loads.includes(m)) {
        loads.push(m);
      }
    });
  }

  const parts = [];
  if (unloads.length) unloads.forEach((m) => parts.push(`module unload ${m}`));
  if (loads.length) loads.forEach((m) => parts.push(`module load ${m}`));
  return parts.join(' ; ');
};

export const buildPerfCmd = (perf) => {
  let cmd = `perf record -F ${perf.freq}`;
  if (perf.callGraph === 'dwarf') cmd += ' --call-graph dwarf';
  cmd += ' -g';
  cmd += ` -o ${perf.output}`;
  cmd += ` -- ${perf.executable}`;
  return cmd;
};

export const buildValgrindCmd = (valgrind) => {
  let cmd = `valgrind --tool=${valgrind.tool}`;
  if (valgrind.tool === 'memcheck') cmd += ` --leak-check=${valgrind.leak} --track-origins=yes`;
  cmd += ` --log-file=${valgrind.logFmt}`;
  cmd += ` ${valgrind.executable}`;
  return cmd;
};

export const buildCudaMemcheckCmd = (cudaMem) => {
  let cmd = `cuda-memcheck --tool ${cudaMem.tool}`;
  cmd += ` ${cudaMem.executable}`;
  return cmd;
};

export const buildSysInfoCmd = (sysinfo) => {
  const cmds = ['echo "===HPC_TOOLS_START==="'];

  if (sysinfo.collectOs) {
    cmds.push('echo "---SECTION:KERNEL---"', 'uname -a');
    cmds.push('echo "---SECTION:OS---"', 'cat /etc/os-release');
    cmds.push('echo "---SECTION:LIMITS---"', 'ulimit -a');
  }

  if (sysinfo.collectCpu) {
    cmds.push('echo "---SECTION:CPU_SUMMARY---"', 'lscpu');
    cmds.push('echo "---SECTION:CPU_TOPOLOGY---"', 'lscpu -e');
  }

  if (sysinfo.collectLstopo) {
    cmds.push('echo "---SECTION:LSTOPO---"', 'if command -v lstopo >/dev/null 2>&1; then lstopo -.xml; else echo "LSTOPO_NOT_FOUND"; fi');
  }

  if (sysinfo.collectMem) {
    cmds.push('echo "---SECTION:MEM---"', 'free -h');
    cmds.push('echo "---SECTION:NUMA---"', 'numactl -H 2>/dev/null || echo "numactl not found"');
  }

  if (sysinfo.collectNvidia) {
    cmds.push('echo "---SECTION:NVIDIA_GPU---"', 'if command -v nvidia-smi >/dev/null 2>&1; then nvidia-smi -q -x; else echo "NVIDIA_SMI_NOT_FOUND"; fi');
  }

  if (sysinfo.collectAmd) {
    cmds.push('echo "---SECTION:AMD_GPU---"', 'if command -v rocm-smi >/dev/null 2>&1; then rocm-smi --showall --json; else echo "ROCM_SMI_NOT_FOUND"; fi');
  }

  if (sysinfo.collectEnv) {
    cmds.push('echo "---SECTION:ENV---"', 'printenv');
    cmds.push('echo "---SECTION:MODULES---"', 'module list 2>&1 || echo "Modules not available"');
  }

  if (sysinfo.collectSlurm) {
    // Collect partition name and its time limit (format: PARTITION|TIMELIMIT)
    cmds.push('echo "---SECTION:SLURM_PARTITIONS---"', 'sinfo -h -o "%P|%l" 2>/dev/null | sort -u || echo "SINFO_FAILED"');
    cmds.push('echo "---SECTION:SLURM_ACCOUNTS---"', 'sacctmgr -n -p show assoc user=$USER format=Account 2>/dev/null | sort -u || echo "SACCTMGR_FAILED"');
    cmds.push('echo "---SECTION:SLURM_QOS---"', 'sacctmgr -n -p show assoc user=$USER format=QOS 2>/dev/null | sort -u || echo "SACCTMGR_FAILED"');
  }

  cmds.push('echo "===HPC_TOOLS_END==="');

  let script = `( ${cmds.join('; ')} )`;
  if (sysinfo.useBase64) {
    script += ' | base64';
  }
  return script;
};

export const buildApptainerCmd = (apt) => {
  let cmd = `apptainer ${apt.command}`;
  if (apt.options) cmd += ` ${apt.options}`;
  if (apt.binds) {
    const bindPaths = apt.binds.split(',').map(s => s.trim()).filter(Boolean);
    if (bindPaths.length) cmd += ` -B ${bindPaths.join(',')}`;
  }
  if (apt.writable) cmd += ' --writable';
  if (apt.nv) cmd += ' --nv';
  if (apt.rocm) cmd += ' --rocm';

  cmd += ` ${apt.image}`;

  if (apt.command === 'exec') {
    cmd += ` ${apt.executable}`;
  }

  return cmd;
};

export const buildCompileCmd = (c) => {
  let cmd = `${c.compiler}`;
  
  if (c.output) cmd += ` -o ${c.output}`;
  
  if (c.optimization) cmd += ` ${c.optimization}`;
  if (c.march) cmd += ` -march=${c.march}`;
  
  if (c.openmp) {
    if (c.compiler === 'icc' || c.compiler === 'icpc') {
      cmd += ' -qopenmp';
    } else if (c.compiler === 'nvcc') {
      cmd += ' -Xcompiler -fopenmp';
    } else {
      cmd += ' -fopenmp';
    }
  }

  if (c.libraries && Array.isArray(c.libraries)) {
    c.libraries.forEach(lib => {
      if (lib === 'mkl') {
        if (c.compiler === 'icc' || c.compiler === 'icpc') {
          cmd += ' -mkl';
        } else {
          cmd += ' -I${MKLROOT}/include -L${MKLROOT}/lib/intel64 -lmkl_rt';
        }
      } else if (lib === 'openblas') {
        cmd += ' -lopenblas';
      } else if (lib === 'fftw3') {
        cmd += ' -lfftw3';
      } else if (lib === 'cuda' && c.compiler !== 'nvcc') {
        cmd += ' -lcudart';
      }
    });
  }

  if (c.customFlags) cmd += ` ${c.customFlags}`;
  
  if (c.src) cmd += ` ${c.src}`;
  
  return cmd.trim();
};
