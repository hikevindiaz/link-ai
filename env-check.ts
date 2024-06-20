// env-check.ts
export const checkEnv = () => {
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
};

