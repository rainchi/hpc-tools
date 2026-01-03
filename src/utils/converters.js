/**
 * PBS/Torque to Slurm Directive Mapping
 */
const PBS_TO_SLURM_MAP = {
  '-N': '--job-name',
  '-q': '--partition',
  '-o': '--output',
  '-e': '--error',
  '-m': '--mail-type',
  '-M': '--mail-user',
  '-A': '--account',
  '-V': '--export=ALL',
  '-j': null, // Special handling
  '-l': null  // Special handling for resources
};

const MAIL_MAP = {
  'a': 'FAIL',
  'b': 'BEGIN',
  'e': 'END',
  'abe': 'ALL'
};

/**
 * Converts a PBS script string to a Slurm script string
 * @param {string} pbsScript 
 * @returns {string}
 */
export function convertPbsToSlurm(pbsScript) {
  if (!pbsScript) return '';

  const lines = pbsScript.split('\n');
  const slurmDirectives = [];
  const body = [];
  
  let nodes = null;
  let ppn = null;
  let walltime = null;
  let mem = null;

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#PBS')) {
      const parts = trimmed.split(/\s+/).slice(1);
      const flag = parts[0];
      const value = parts.slice(1).join(' ');

      if (flag === '-l') {
        // Handle resources: -l nodes=1:ppn=4,walltime=01:00:00,mem=10gb
        // Also handle PBS Pro select syntax: -l select=2:ncpus=8:mpiprocs=8
        const resources = value.split(',');
        resources.forEach(res => {
          const [k, v] = res.split('=');
          if (k === 'nodes') {
            const subParts = v.split(':');
            nodes = subParts[0];
            const ppnPart = subParts.find(p => p.startsWith('ppn='));
            if (ppnPart) ppn = ppnPart.split('=')[1];
          } else if (k === 'select') {
            const subParts = v.split(':');
            nodes = subParts[0];
            const ncpusPart = subParts.find(p => p.startsWith('ncpus=') || p.startsWith('mpiprocs='));
            if (ncpusPart) ppn = ncpusPart.split('=')[1];
          } else if (k === 'ppn' || k === 'ncpus' || k === 'mpiprocs') {
            ppn = v;
          } else if (k === 'walltime') {
            walltime = v;
          } else if (k === 'mem') {
            mem = v;
          }
        });
      } else if (flag === '-j') {
        if (value === 'oe') {
          // Slurm combines by default if only --output is specified, 
          // but we can explicitly note it or just ignore if we handle -o/-e
        }
      } else if (flag === '-m') {
        const mappedMail = MAIL_MAP[value] || value.toUpperCase();
        slurmDirectives.push(`#SBATCH --mail-type=${mappedMail}`);
      } else if (flag === '-V') {
        slurmDirectives.push(`#SBATCH --export=ALL`);
      } else if (PBS_TO_SLURM_MAP[flag]) {
        slurmDirectives.push(`#SBATCH ${PBS_TO_SLURM_MAP[flag]}=${value}`);
      } else {
        slurmDirectives.push(`#SBATCH ${flag} ${value} # Unrecognized PBS flag`);
      }
    } else {
      // Handle environment variables in the body
      let processedLine = line
        .replace(/\$PBS_O_WORKDIR/g, '$SLURM_SUBMIT_DIR')
        .replace(/\$PBS_NODEFILE/g, '$SLURM_JOB_NODELIST')
        .replace(/\$PBS_JOBID/g, '$SLURM_JOB_ID')
        .replace(/\$PBS_ARRAYID/g, '$SLURM_ARRAY_TASK_ID');
      
      body.push(processedLine);
    }
  }

  // Add collected resources
  if (nodes) slurmDirectives.push(`#SBATCH --nodes=${nodes}`);
  if (ppn) slurmDirectives.push(`#SBATCH --ntasks-per-node=${ppn}`);
  if (walltime) slurmDirectives.push(`#SBATCH --time=${walltime}`);
  if (mem) slurmDirectives.push(`#SBATCH --mem=${mem}`);

  // Construct final script
  let result = '#!/bin/bash\n';
  if (slurmDirectives.length > 0) {
    result += slurmDirectives.join('\n') + '\n';
  }
  
  // Add a helpful comment if we found workdir usage
  if (pbsScript.includes('cd $PBS_O_WORKDIR')) {
    // Slurm starts in the submit directory by default, so cd is often unnecessary
    // but we keep the replaced version for safety.
  }

  result += '\n' + body.join('\n');

  return result.trim();
}
