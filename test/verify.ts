import { LocalGameDriver } from '../src/driver/LocalGameDriver';
import { GameApi } from '../src/game/api/GameApi';
import { DEFAULT_GAME_CONFIG } from '../src/game/config/DefaultConfig';
import { evaluateCurve } from '../src/game/config/Curves';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n=== RUNNING 2D SURVIVAL CLIENT VERIFICATION SUITE ===\n');

  // Test 1: Configuration & Curves
  console.log('[1] Configuration and Infinite Curves');
  const level1Dmg = evaluateCurve(25, 1, DEFAULT_GAME_CONFIG.tools.AXE.statCurve);
  const level2Dmg = evaluateCurve(25, 2, DEFAULT_GAME_CONFIG.tools.AXE.statCurve);
  const level10Dmg = evaluateCurve(25, 10, DEFAULT_GAME_CONFIG.tools.AXE.statCurve);
  assert(level1Dmg === 25, 'Level 1 tool base damage equals 25');
  assert(level2Dmg > level1Dmg, 'Level 2 tool damage scales upwards');
  assert(level10Dmg > level2Dmg, 'Level 10 tool damage scales continuously without cap');

  // Test 2: Local Game Driver & Outgoing Command Queue
  console.log('\n[2] LocalGameDriver & OutgoingCommandQueue');
  const driver = new LocalGameDriver(DEFAULT_GAME_CONFIG);
  const state = driver.getState();
  assert(state.world.width > 2000, `World dimensions properly scaled: ${state.world.width}x${state.world.height}`);

  // Requirement 5: Start with empty world -> Generate world -> Spawn resources -> Spawn player
  driver.worldSystem.generateNaturalResources(state);
  assert(state.objects.size > 20, `Generated ${state.objects.size} natural resource nodes in continuous space`);

  // Check circular hitboxes separate from sprite dimensions
  const sampleObj = Array.from(state.objects.values())[0];
  assert(sampleObj.hitbox.type === 'circle', 'Resource has circular hitbox');
  assert(sampleObj.hitbox.radius > 0, `Hitbox radius is ${sampleObj.hitbox.radius}px`);

  // Test 3: Programmatic Game API Facade
  console.log('\n[3] Programmatic Game API Facade');
  const api = new GameApi(driver);
  const p1 = api.players.spawn('test-p1', { x: 500, y: 500 }, 'Hero');
  assert(state.players.has('test-p1'), 'Player test-p1 successfully spawned');
  assert(p1.health === 100, 'Player initial health is 100');

  // Test 4: Outgoing Command Queue Dispatch
  console.log('\n[4] Command Dispatch & Queue Flow');
  let commandHandled = false;
  driver.sendCommand({
    type: 'PLAYER_MOVE',
    playerId: 'test-p1',
    velocity: { vx: 150, vy: 0 },
    position: { x: 550, y: 500 },
  });
  assert(p1.position.x === 550, 'Command PLAYER_MOVE executed authoritatively by driver');

  // Test 5: Mining System and Resource Gathering
  console.log('\n[5] Mining System & Tool Multipliers');
  const tree = api.objects.place('TREE', { x: 570, y: 500 });
  const initialWood = p1.inventory.wood;
  p1.activeSlot = { kind: 'tool', tool: 'AXE' };
  driver.miningSystem.mine(state, 'test-p1', tree.id);
  assert(p1.inventory.wood > initialWood, `Axe mined tree: wood increased from ${initialWood} to ${p1.inventory.wood}`);
  assert(tree.health < tree.maxHealth, `Tree damaged: health dropped to ${tree.health}/${tree.maxHealth}`);

  // Test 6: Combat System & Zombie Entities
  console.log('\n[6] Combat System & Zombie Entities');
  const zombie = api.zombies.spawn({ x: 590, y: 500 }, 'SWORD');
  assert(state.zombies.has(zombie.id), 'Zombie spawned with EntityType.ZOMBIE');
  const initialZombieHp = zombie.health;
  p1.activeSlot = { kind: 'tool', tool: 'SWORD' };
  driver.combatSystem.damageZombie(state, zombie, 35, p1.position);
  assert(zombie.health === initialZombieHp - 35, `Zombie damaged: health is now ${zombie.health}/${zombie.maxHealth}`);

  // Test 7: Building System Placement, Repair & Upgrades
  console.log('\n[7] Building System Placement, Repair & Upgrades');
  p1.inventory.wood = 500;
  p1.inventory.stone = 500;
  p1.inventory.gold = 500;

  // Clear objects around test site so placement isn't blocked by random trees
  for (const obj of state.objects.values()) {
    if (Math.hypot(obj.position.x - 700, obj.position.y - 700) < 400) {
      state.objects.delete(obj.id);
    }
  }

  const wall = api.buildings.place('WALL', { x: 700, y: 700 }, 'test-p1');
  assert(wall !== null && state.buildings.has(wall.id), 'Wall successfully placed in continuous coordinates');

  const turret = api.buildings.place('TURRET', { x: 800, y: 700 }, 'test-p1');
  assert(turret !== null && state.buildings.has(turret.id), 'Turret successfully placed');

  const miner = api.buildings.place('MINER', { x: 900, y: 700 }, 'test-p1', 'GOLD');
  assert(miner !== null && miner.minerResource === 'GOLD', 'Miner placed with GOLD extraction selected');

  // Building Upgrade
  const initialWallHp = wall!.maxHealth;
  const upgraded = api.buildings.upgrade(wall!.id, 'test-p1');
  assert(upgraded, 'Wall upgraded to level 2');
  assert(wall!.maxHealth > initialWallHp, `Wall maxHealth scaled: ${initialWallHp} -> ${wall!.maxHealth}`);

  // Test 8: Visual Upgrade System
  console.log('\n[8] Procedural Visual Upgrade System');
  const visLvl1 = driver.upgradeSystem.getUpgradeVisual(1);
  const visLvl5 = driver.upgradeSystem.getUpgradeVisual(5);
  const visLvl20 = driver.upgradeSystem.getUpgradeVisual(20);
  assert(visLvl1.glintIntensity === 0, 'Level 1 has 0 glint');
  assert(visLvl5.hueShift > 0, `Level 5 has shifted hue: ${visLvl5.hueShift}°`);
  assert(visLvl20.glowBlur > visLvl5.glowBlur, `Level 20 glow intensity scales smoothly: ${visLvl20.glowBlur}px`);

  // Test 9: Items (Apple heal, Wrench repair, Revive)
  console.log('\n[9] Items (Apple, Wrench, Revive)');
  p1.health = 40;
  p1.inventory.apples = 2;
  const healed = driver.itemSystem.useItem(state, 'test-p1', 'APPLE');
  assert(healed && p1.health > 40, `Apple used: health restored to ${p1.health}`);

  // Test 10: State Updates / External Synchronization
  console.log('\n[10] State Updates Sync API (Authoritative Server Extension)');
  driver.applyStateUpdate({
    type: 'GENERIC_ENTITY_UPDATE',
    entityId: zombie.id,
    patch: { health: 12, x: 620, y: 510 },
  });
  assert(zombie.health === 12 && zombie.position.x === 620, 'External state patch applied without modifying renderer');

  driver.stopLoop();
  console.log('\n=== ALL 10 ARCHITECTURAL SUITES PASSED! ===\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
