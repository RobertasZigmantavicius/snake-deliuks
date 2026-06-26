const POWERUPS = [
  {
    id: 'speed',
    label: 'Speed Burst',
    color: 0xff6600,
    minStage: 2,
    duration: 5000,
    unlockCondition: null,
  },
  {
    id: 'ghost',
    label: 'Ghost',
    color: 0xaaaaff,
    minStage: 3,
    duration: 4000,
    unlockCondition: (profile) => profile.dominant === 'cautious',
  },
  {
    id: 'magnet',
    label: 'Magnet',
    color: 0xffcc00,
    minStage: 3,
    duration: 5000,
    unlockCondition: (profile) => profile.dominant === 'greedy',
  },
  {
    id: 'slow',
    label: 'Slow Field',
    color: 0x44ffff,
    minStage: 3,
    duration: 6000,
    unlockCondition: null,
  },
];
