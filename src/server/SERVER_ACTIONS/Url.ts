"use server";
const getBaseUrl = () => {
    if (typeof window !== "undefined") return "";
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    return `http://localhost:${process.env.PORT ?? 3000}`;
};
export { getBaseUrl };  