import {publicSupabaseKey} from './public-supabase-config.mjs';
if(process.argv.includes('--production-web')) publicSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
for(const name of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_SUPABASE_ANON_KEY']){
 if(process.env[name])publicSupabaseKey(process.env[name]);
}
console.log('Public auth build configuration checked; no privileged key was accepted.');
