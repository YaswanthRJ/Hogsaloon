export interface MatchmakingPreferences {
  interests: string[];
  languages: string[];
}

export type JoinQueueResult =
  | {
      status: 'DUPLICATE';
    }
  | {
      status: 'WAITING';
    }
  | {
      status: 'MATCHED';
      first: string;
      second: string;
    };