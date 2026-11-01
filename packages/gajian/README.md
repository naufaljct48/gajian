# gajian

Indonesian payroll math as a zero-dependency TypeScript library: PPh 21 TER bulanan/harian (PP 58/2023), December reconciliation with Pasal 17 (PMK 168/2023), PTKP, BPJS Ketenagakerjaan and BPJS Kesehatan. Integer rupiah; every result has a `breakdown` citing the regulation.

```ts
import { payslip } from 'gajian';
payslip({ components: [{ label: 'Gaji pokok', amount: 10_000_000, fixed: true }], status: 'K/1', period: '2025-06', jkkClass: 'sangatRendah' }).takeHome; // 9443190
```

Full docs, API table, sources and limits: https://github.com/naufaljct48/gajian#readme

Not tax advice. MIT.
