import { ActiveSlotType, BuildingType, EntityId, ItemType, Position, ResourceType, ToolType, Velocity } from '../entities/EntityTypes';

export type GameCommand =
  | {
      type: 'PLAYER_MOVE';
      playerId: EntityId;
      velocity: Velocity;
      position?: Position;
    }
  | {
      type: 'PLAYER_AIM';
      playerId: EntityId;
      rotation: number;
    }
  | {
      type: 'PLAYER_SELECT_SLOT';
      playerId: EntityId;
      slot: ActiveSlotType;
    }
  | {
      type: 'PLAYER_ATTACK';
      playerId: EntityId;
    }
  | {
      type: 'PLAYER_MINE';
      playerId: EntityId;
      resourceId?: EntityId;
    }
  | {
      type: 'PLAYER_USE_ITEM';
      playerId: EntityId;
      item: ItemType;
      targetEntityId?: EntityId;
    }
  | {
      type: 'PLAYER_PLACE_BUILDING';
      playerId: EntityId;
      building: BuildingType;
      position: Position;
      minerResource?: ResourceType;
    }
  | {
      type: 'PLAYER_UPGRADE_TOOL';
      playerId: EntityId;
      tool: ToolType;
    }
  | {
      type: 'PLAYER_UPGRADE_BUILDING';
      playerId: EntityId;
      buildingId: EntityId;
    }
  | {
      type: 'PLAYER_REPAIR_BUILDING';
      playerId: EntityId;
      buildingId: EntityId;
    }
  | {
      type: 'PLAYER_REVIVE';
      playerId: EntityId;
      targetPlayerId: EntityId;
    };
