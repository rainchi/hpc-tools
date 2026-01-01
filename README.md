# HPC Tools 🚀

HPC Tools is a web-based command generator designed specifically for High-Performance Computing (HPC) users. It helps users quickly generate complex commands for MPI, Slurm, profiling tools, and containers, reducing errors in manual script writing.

## Key Features

- **MPI Runner**: Supports OpenMPI, Intel MPI, and MPICH. Automatically generates core binding and hostfile parameters.
- **Slurm Script Generator**: 
  - Quickly generate `sbatch` scripts.
  - Supports advanced flags (Memory, QoS, GPU binding, constraints).
  - Supports Slurm Array jobs.
- **Profiling Tools**:
  - **NVIDIA**: Supports Nsight Systems (`nsys`), Nsight Compute (`ncu`), and legacy `nvprof`.
  - **CPU**: Supports `perf record`.
  - **Debugging**: Supports `Valgrind` and `CUDA-MEMCHECK`.
- **System Info Viewer**: Parses and visualizes HPC node hardware topology (lstopo), CPU, memory, and GPU information.
- **Container Support (Apptainer / Singularity)**:
  - Command Generator: Quickly generate `exec`, `run`, and `shell` commands.
  - **Apptainer Builder**: Interactive generator for Apptainer definition files (.def).
- **Environment Modules**: Interactively select and generate `module load` commands.
- **Data Transfer**: Supports `rsync` and `scp` command generation.

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Native CSS (Scoped)

## Development and Deployment

### Install Dependencies

```sh
npm install
```

### Local Development

```sh
npm run dev
```

### Build for Production

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## Project Structure

- `src/App.vue`: Main application logic and UI layout.
- `src/utils/builders.js`: Core command generation logic.
- `src/components/`: Vue components for various features.
  - `SystemInfoViewer.vue`: System information parsing and display.
  - `ApptainerBuilder.vue`: Container definition file generator.
  - `CpuBinding.vue`: MPI core binding helper tool.

