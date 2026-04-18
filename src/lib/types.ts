export interface SideReagent {
  id: string;
  text: string;
}

export interface EdgeReagent {
  id: string;
  pos: number; // 0.0 to 1.0 along the edge
  text: string;
}

export type ChemNodeType = 'process';

export interface ChemNode {
  id: string;
  type: ChemNodeType;
  position: { x: number; y: number };
  data: {
    text: string;
    sides: SideReagent[]; // Reagents added to the side of this process
    groupId?: string; // For syncing height between siblings
    branchReagents?: EdgeReagent[]; // Reagents added BEFORE the split point
  };
}

export interface ChemEdge {
  id: string;
  source: string;
  target: string;
  type: string; // 'process_edge'
  data?: {
    reagents: EdgeReagent[]; // Reagents added along this edge
  };
}
