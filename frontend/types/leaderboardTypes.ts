export interface LeaderboardEntry {
    rank: number;
    email: string;
    points: number;
}

export interface LeaderboardData {
    top_users: LeaderboardEntry[];
    current_user: LeaderboardEntry | null;
}
