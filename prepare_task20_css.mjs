import fs from 'fs';

// 1. Extra CSS Styles to add to <style>
const EXTRA_CSS = `
/* TASK 20 PRODUCT STYLES */
.pill-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0 10px;
  margin-bottom: 12px;
  scrollbar-width: none;
}
.pill-tabs::-webkit-scrollbar { display: none; }
.pill-tab {
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--surface-light);
  color: #888;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}
.pill-tab.active {
  background: var(--gold);
  color: #000;
  border-color: var(--gold);
  box-shadow: 0 0 10px rgba(212,175,55,0.3);
}

.card-compact {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  transition: border-color 0.2s;
}
.card-compact:hover {
  border-color: #444;
}

.macro-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  margin-right: 4px;
}
.macro-kcal { background: rgba(212,175,55,0.15); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); }
.macro-pro { background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3); }
.macro-carb { background: rgba(33,150,243,0.15); color: #2196f3; border: 1px solid rgba(33,150,243,0.3); }
.macro-fat { background: rgba(255,152,0,0.15); color: #ff9800; border: 1px solid rgba(255,152,0,0.3); }

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 10px;
}
.calendar-day-header {
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  color: #666;
  padding: 6px 0;
}
.calendar-cell {
  aspect-ratio: 1;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.2s;
}
.calendar-cell:hover {
  border-color: var(--gold);
}
.calendar-cell.active {
  border: 2px solid var(--gold);
  background: rgba(212,175,55,0.1);
}
.calendar-cell.today {
  color: var(--gold);
}
.calendar-badges-row {
  display: flex;
  gap: 2px;
  font-size: 8px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #1a1a1a;
}
.timeline-time {
  font-size: 11px;
  font-weight: 800;
  color: var(--gold);
  width: 50px;
  flex-shrink: 0;
}
.timeline-content {
  flex: 1;
}

.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 600px) {
  .pricing-grid { grid-template-columns: 1fr 1fr; }
}
.pricing-card {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.pricing-card.popular {
  border: 2px solid var(--gold);
  background: linear-gradient(135deg, #18150c 0%, #0d0d0d 100%);
}

.menu-hub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 10px 0;
}
.menu-hub-item {
  background: #141414;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.menu-hub-item:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}
.menu-hub-icon {
  font-size: 24px;
  margin-bottom: 6px;
}
.menu-hub-label {
  font-size: 10px;
  font-weight: 800;
  color: #ccc;
  text-transform: uppercase;
}

.set-type-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 4px;
  border-radius: 4px;
  background: #222;
  color: #aaa;
  cursor: pointer;
  text-align: center;
}
.set-type-badge.working { color: var(--gold); border: 1px solid rgba(212,175,55,0.4); }
.set-type-badge.warmup { color: #888; border: 1px solid #444; }
.set-type-badge.backoff { color: #2196f3; border: 1px solid rgba(33,150,243,0.4); }
.set-type-badge.dropset { color: #ff9800; border: 1px solid rgba(255,152,0,0.4); }
.set-type-badge.amrap { color: #e91e63; border: 1px solid rgba(233,30,99,0.4); }
.set-type-badge.failure { color: var(--accent-red); border: 1px solid rgba(255,77,77,0.4); }

.quick-hub-btn {
  background: #141414;
  border: 1px solid #222;
  border-radius: 10px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-hub-btn:hover {
  border-color: var(--gold);
  background: #181818;
}
`;

console.log('Extra CSS prepared.');
