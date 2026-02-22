export type PublicUser = {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  keyboardLayout: "qwerty" | "dvorak" | "colemak";
};

