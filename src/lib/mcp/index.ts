import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getMyListings from "./tools/get-my-listings";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "elan24-mcp",
  title: "Elan24",
  version: "0.1.0",
  instructions:
    "Elan24 is an Azerbaijani real-estate classifieds platform. Use search_listings for public property search, and get_my_listings / get_my_profile for the signed-in user's own data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchListings, getMyListings, getMyProfile],
});
