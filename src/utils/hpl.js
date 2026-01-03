/**
 * HPL.dat configuration parser and generator
 */

export const HPL_PARAMETERS = [
  { key: 'outFile', label: 'Output file name', default: 'HPL.out', desc: '輸出檔名' },
  { 
    key: 'outDevice', 
    label: 'Device out', 
    default: 6, 
    desc: '輸出裝置',
    options: [
      { value: 6, label: '6 (stdout)' },
      { value: 7, label: '7 (stderr)' },
      { value: 8, label: '8 (file)' }
    ]
  },
  { key: 'ns', label: 'Ns', default: [29000], desc: '問題大小 (N)' },
  { key: 'nbs', label: 'NBs', default: [128], desc: '區塊大小 (NB)' },
  { 
    key: 'pmap', 
    label: 'PMAP', 
    default: 0, 
    desc: '程序映射',
    options: [
      { value: 0, label: '0 (Row-major)' },
      { value: 1, label: '1 (Column-major)' }
    ],
    details: `Process Mapping (PMAP) 決定 MPI Rank 如何映射到 P x Q 的網格上。

[0] Row-major (列優先):
連續的 Rank 會先填滿同一列。
+-------+-------+-------+
| Rank0 | Rank1 | Rank2 |
+-------+-------+-------+
| Rank3 | Rank4 | Rank5 |
+-------+-------+-------+

[1] Column-major (行優先):
連續的 Rank 會先填滿同一行。
+-------+-------+-------+
| Rank0 | Rank2 | Rank4 |
+-------+-------+-------+
| Rank1 | Rank3 | Rank5 |
+-------+-------+-------+`
  },
  { key: 'ps', label: 'Ps', default: [2], desc: '程序列數 (P)' },
  { key: 'qs', label: 'Qs', default: [2], desc: '程序行數 (Q)' },
  { key: 'threshold', label: 'Threshold', default: 16.0, desc: '殘差閾值' },
  { 
    key: 'pfacts', 
    label: 'PFACTs', 
    default: [2], 
    desc: '面板分解',
    options: [
      { value: 0, label: '0 (Left)' },
      { value: 1, label: '1 (Crout)' },
      { value: 2, label: '2 (Right)' }
    ],
    details: `Panel Factorization (PFACTs) 決定了面板分解的策略。

[0] Left-looking:
適合記憶體頻寬較小的系統。

[1] Crout:
適合通訊延遲較高的網路。

[2] Right-looking:
適合大多數現代系統，能有效利用 Cache，通常能獲得最佳效能。`
  },
  { key: 'nbmins', label: 'NBMINs', default: [4], desc: '遞迴停止條件' },
  { key: 'ndivs', label: 'NDIVs', default: [2], desc: '遞迴面板數' },
  { 
    key: 'rfacts', 
    label: 'RFACTs', 
    default: [1], 
    desc: '遞迴面板分解',
    options: [
      { value: 0, label: '0 (Left)' },
      { value: 1, label: '1 (Crout)' },
      { value: 2, label: '2 (Right)' }
    ],
    details: `Recursive Panel Factorization (RFACTs) 決定了遞迴步驟中的分解策略。
選項與 PFACTs 相同，通常建議嘗試不同的組合以找出最佳效能。

[0] Left
[1] Crout
[2] Right`
  },
  { 
    key: 'bcasts', 
    label: 'BCASTs', 
    default: [1], 
    desc: '廣播演算法',
    options: [
      { value: 0, label: '0 (1rg)' },
      { value: 1, label: '1 (1rM)' },
      { value: 2, label: '2 (2rg)' },
      { value: 3, label: '3 (2rM)' },
      { value: 4, label: '4 (Lng)' },
      { value: 5, label: '5 (LnM)' }
    ],
    details: `Broadcast (BCASTs) 決定了面板廣播的演算法。
命名規則：[拓樸] [方向] [演算法]

- 1rg: 1-ring
- 1rM: 1-ring (Modified)
- 2rg: 2-ring
- 2rM: 2-ring (Modified)
- Lng: Long message
- LnM: Long message (Modified)

通常 [1] 1rM 或 [2] 2rg 在大多數系統上表現較好。`
  },
  { key: 'depths', label: 'DEPTHs', default: [1], desc: '預讀深度 (Lookahead depth)', details: `Lookahead Depth (DEPTHs) 決定了預讀的深度。

- 0: 不預讀 (No lookahead)
- 1: 預讀一步 (Depth 1) - 最常用
- >=2: 更深的預讀

增加深度可以隱藏通訊延遲，但會增加記憶體消耗。通常設為 1 即可。` },
  { 
    key: 'swap', 
    label: 'SWAP', 
    default: 2, 
    desc: '交換演算法',
    options: [
      { value: 0, label: '0 (bin-exch)' },
      { value: 1, label: '1 (long)' },
      { value: 2, label: '2 (mix)' }
    ]
  },
  { key: 'swappingThreshold', label: 'Swapping threshold', default: 64, desc: '交換閾值' },
  { 
    key: 'l1', 
    label: 'L1', 
    default: 0, 
    desc: 'L1 形式',
    options: [
      { value: 0, label: '0 (transposed)' },
      { value: 1, label: '1 (no-transposed)' }
    ]
  },
  { 
    key: 'u', 
    label: 'U', 
    default: 0, 
    desc: 'U 形式',
    options: [
      { value: 0, label: '0 (transposed)' },
      { value: 1, label: '1 (no-transposed)' }
    ]
  },
  { 
    key: 'equilibration', 
    label: 'Equilibration', 
    default: 1, 
    desc: '平衡',
    options: [
      { value: 0, label: '0 (No)' },
      { value: 1, label: '1 (Yes)' }
    ]
  },
  { key: 'alignment', label: 'Memory alignment', default: 8, desc: '記憶體對齊 (double)' },
];

export const parseHplDat = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 3) return null;

  const config = {};
  
  // Skip first two lines (header)
  let idx = 2;

  const getNextValue = () => {
    if (idx >= lines.length) return null;
    const line = lines[idx++];
    const parts = line.split(/\s+/);
    return parts[0];
  };

  const getNextList = () => {
    if (idx >= lines.length) return null;
    const countLine = lines[idx++];
    const count = parseInt(countLine.split(/\s+/)[0]);
    if (idx >= lines.length) return null;
    const valuesLine = lines[idx++];
    const values = valuesLine.split(/\s+/).slice(0, count).map(v => isNaN(v) ? v : Number(v));
    return values;
  };

  config.outFile = getNextValue();
  config.outDevice = Number(getNextValue());
  config.ns = getNextList();
  config.nbs = getNextList();
  config.pmap = Number(getNextValue());
  
  // Process grids (P x Q)
  const gridCountLine = lines[idx++];
  const gridCount = parseInt(gridCountLine.split(/\s+/)[0]);
  const psLine = lines[idx++];
  config.ps = psLine.split(/\s+/).slice(0, gridCount).map(Number);
  const qsLine = lines[idx++];
  config.qs = qsLine.split(/\s+/).slice(0, gridCount).map(Number);

  config.threshold = Number(getNextValue());
  
  config.pfacts = getNextList();
  config.nbmins = getNextList();
  config.ndivs = getNextList();
  config.rfacts = getNextList();
  config.bcasts = getNextList();
  config.depths = getNextList();
  
  config.swap = Number(getNextValue());
  config.swappingThreshold = Number(getNextValue());
  config.l1 = Number(getNextValue());
  config.u = Number(getNextValue());
  config.equilibration = Number(getNextValue());
  config.alignment = Number(getNextValue());

  return config;
};

export const generateHplDat = (config) => {
  const lines = [
    'HPLinpack benchmark input file',
    'Innovative Computing Laboratory, University of Tennessee',
    `${config.outFile || 'HPL.out'}      output file name (if any)`,
    `${config.outDevice ?? 6}            device out (6=stdout,7=stderr,file)`,
    `${config.ns.length}            # of problems sizes (N)`,
    `${config.ns.join(' ')}        Ns`,
    `${config.nbs.length}            # of NBs`,
    `${config.nbs.join(' ')}          NBs`,
    `${config.pmap ?? 0}            PMAP process mapping (0=Row-,1=Column-major)`,
    `${config.ps.length}            # of process grids (P x Q)`,
    `${config.ps.join(' ')}            Ps`,
    `${config.qs.join(' ')}            Qs`,
    `${config.threshold ?? 16.0}         threshold`,
    `${config.pfacts.length}            # of panel fact`,
    `${config.pfacts.join(' ')}            PFACTs (0=left, 1=Crout, 2=Right)`,
    `${config.nbmins.length}            # of recursive stopping criterium`,
    `${config.nbmins.join(' ')}            NBMINs (>= 1)`,
    `${config.ndivs.length}            # of panels in recursion`,
    `${config.ndivs.join(' ')}            NDIVs`,
    `${config.rfacts.length}            # of recursive panel fact.`,
    `${config.rfacts.join(' ')}            RFACTs (0=left, 1=Crout, 2=Right)`,
    `${config.bcasts.length}            # of broadcast`,
    `${config.bcasts.join(' ')}            BCASTs (0=1rg,1=1rM,2=2rg,3=2rM,4=Lng,5=LnM)`,
    `${config.depths.length}            # of lookahead depth`,
    `${config.depths.join(' ')}            DEPTHs (>=0)`,
    `${config.swap ?? 2}            SWAP (0=bin-exch,1=long,2=mix)`,
    `${config.swappingThreshold ?? 64}           swapping threshold`,
    `${config.l1 ?? 0}            L1 in (0=transposed,1=no-transposed) form`,
    `${config.u ?? 0}            U  in (0=transposed,1=no-transposed) form`,
    `${config.equilibration ?? 1}            Equilibration (0=no,1=yes)`,
    `${config.alignment ?? 8}            memory alignment in double (> 0)`
  ];
  return lines.join('\n');
};

export const suggestN = (memoryGB, ratio = 0.8) => {
  // N = sqrt(Memory * 1024^3 * ratio / 8)
  const bytes = memoryGB * 1024 * 1024 * 1024 * ratio;
  const n = Math.floor(Math.sqrt(bytes / 8));
  // Round to multiple of 128 or 256 for better performance
  return Math.floor(n / 128) * 128;
};

export const suggestPQ = (totalProcesses) => {
  // Find P and Q such that P * Q = totalProcesses and P is as close to Q as possible, with P <= Q
  let p = Math.floor(Math.sqrt(totalProcesses));
  while (p > 0) {
    if (totalProcesses % p === 0) {
      return { p, q: totalProcesses / p };
    }
    p--;
  }
  return { p: 1, q: totalProcesses };
};

export const getNearbySuggestions = (totalProcesses) => {
  const suggestions = [];
  // Check range of +/- 5
  for (let n = Math.max(1, totalProcesses - 5); n <= totalProcesses + 5; n++) {
    if (n === totalProcesses) continue;
    const { p, q } = suggestPQ(n);
    // A "good" suggestion is one where P is not 1 (unless n is very small)
    if (p > 1 || n <= 3) {
      suggestions.push({ n, p, q, ratio: p / q });
    }
  }
  // Sort by ratio (closer to 1 is better) and then by proximity to totalProcesses
  return suggestions.sort((a, b) => {
    const ratioDiff = Math.abs(1 - b.ratio) - Math.abs(1 - a.ratio);
    if (Math.abs(ratioDiff) < 0.01) {
      return Math.abs(a.n - totalProcesses) - Math.abs(b.n - totalProcesses);
    }
    return b.ratio - a.ratio;
  }).slice(0, 3);
};
