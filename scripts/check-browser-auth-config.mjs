import {publicSupabaseKey} from './public-supabase-config.mjs';
for(const name of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_SUPABASE_ANON_KEY']){
 if(process.env[name])publicSupabaseKey(process.env[name]);
}
console.log('Public auth build configuration checked; no privileged key was accepted.');
