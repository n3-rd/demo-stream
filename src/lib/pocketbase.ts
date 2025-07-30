import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
 
export const pb = new PocketBase(PUBLIC_POCKETBASE_INSTANCE); 