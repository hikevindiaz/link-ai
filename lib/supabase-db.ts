import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase-db';

// Create a Supabase client for database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Public client with limited permissions
export const supabaseDb = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Service client with higher privileges (for server-side operations)
export const supabaseAdminDb = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Function to synchronize schema changes to Supabase
export async function syncSchemaToSupabase(): Promise<void> {
  try {
    const { error } = await supabaseAdminDb.rpc('sync_schema_from_prisma');
    
    if (error) {
      console.error('Error syncing schema to Supabase:', error);
    } else {
      console.log('Successfully synchronized schema to Supabase');
    }
  } catch (error) {
    console.error('Error calling schema sync function:', error);
  }
}

// Generic function to fetch data from Supabase
export async function fetchFromSupabase<T>(
  table: string,
  options?: {
    columns?: string;
    eq?: { column: string; value: any };
    limit?: number;
    order?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  try {
    let query = supabaseDb.from(table).select(options?.columns || '*');
    
    if (options?.eq) {
      query = query.eq(options.eq.column, options.eq.value);
    }
    
    if (options?.order) {
      query = query.order(
        options.order.column,
        { ascending: options.order.ascending ?? true }
      );
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      return [];
    }
    
    return data as T[];
  } catch (error) {
    console.error(`Error in fetchFromSupabase (${table}):`, error);
    return [];
  }
}

// Generic function to insert data into Supabase
export async function insertToSupabase<T>(
  table: string,
  data: Partial<T> | Partial<T>[]
): Promise<{ success: boolean; data?: T[]; error?: any }> {
  try {
    const { data: result, error } = await supabaseAdminDb
      .from(table)
      .insert(data)
      .select();
    
    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return { success: false, error };
    }
    
    return { success: true, data: result as T[] };
  } catch (error) {
    console.error(`Error in insertToSupabase (${table}):`, error);
    return { success: false, error };
  }
}

// Generic function to update data in Supabase
export async function updateInSupabase<T>(
  table: string,
  data: Partial<T>,
  match: { column: string; value: any }
): Promise<{ success: boolean; data?: T[]; error?: any }> {
  try {
    const { data: result, error } = await supabaseAdminDb
      .from(table)
      .update(data)
      .eq(match.column, match.value)
      .select();
    
    if (error) {
      console.error(`Error updating in ${table}:`, error);
      return { success: false, error };
    }
    
    return { success: true, data: result as T[] };
  } catch (error) {
    console.error(`Error in updateInSupabase (${table}):`, error);
    return { success: false, error };
  }
}

// Generic function to delete data from Supabase
export async function deleteFromSupabaseDb(
  table: string,
  match: { column: string; value: any }
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabaseAdminDb
      .from(table)
      .delete()
      .eq(match.column, match.value);
    
    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error in deleteFromSupabaseDb (${table}):`, error);
    return { success: false, error };
  }
} 