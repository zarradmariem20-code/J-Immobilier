// Create an inquiry (contact request) for a property
export async function createInquiry(data: any) {
  // Replace 'inquiries' with your actual table name
  const { data: result, error } = await supabase.from("inquiries").insert([data]).select();
  if (error) throw error;
  return result?.[0] || null;
}

// Create a report (flag) for a property
export async function createReport(data: any) {
  // Replace 'reports' with your actual table name
  const { data: result, error } = await supabase.from("reports").insert([data]).select();
  if (error) throw error;
  return result?.[0] || null;
}

// Fetch a single property by ID
export async function getProperty(id: number) {
  const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

// Toggle favorite (stub)
export async function toggleFavorite(propertyId: number) {
  // Implement actual favorite logic as needed
  return propertyId;
}
// Fetch all properties from Supabase
export async function getProperties() {
  const { data, error } = await supabase.from("properties").select("*");
  if (error) throw error;
  return data || [];
}
import { supabase } from "./supabase";

// Example: create a new property listing in Supabase
export async function createSubmission(data: any) {
  // Replace 'properties' with your actual table name
  const { data: result, error } = await supabase.from("properties").insert([data]).select();
  if (error) throw error;
  return result?.[0] || null;
}

// Example: upload media to Supabase Storage (stub)
export async function uploadAllMedia(files: File[]) {
  // You should implement actual upload logic here
  // For now, just simulate success
  return files.map((file, i) => ({ url: `https://dummy.supabase.storage/${file.name}`, name: file.name, id: i }));
}
