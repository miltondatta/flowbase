declare global {
  interface Liveblocks {
    Presence: {
      activeTaskId: string | null;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        email: string;
        initials: string;
        color: string;
      };
    };
    ThreadMetadata: {
      boardId: string;
      taskId: string;
    };
  }
}

export {};
