alter table public.properties
  add column if not exists region text,
  add column if not exists city text;

create index if not exists properties_region_idx on public.properties (region);
create index if not exists properties_city_idx on public.properties (city);

update public.properties
set
  region = coalesce(region, 'Sousse'),
  city = coalesce(
    city,
    case
      when location ilike '%Hammam Sousse%' then 'Hammam Sousse'
      when location ilike '%Chatt Meriem%' or location ilike '%Chott Meriem%' then 'Chott Meriem'
      when location ilike '%Kalâa Sghira%' or location ilike '%Kalaa Sghira%' then 'Kalaa Sghira'
      when location ilike '%Sidi Bou Ali%' then 'Sidi Bou Ali'
      when location ilike '%Sahloul%' then 'Sousse'
      when location ilike '%Khézema%' or location ilike '%Khezema%' then 'Sousse'
      when location ilike '%Centre-ville%' then 'Sousse'
      when location ilike '%Sousse%' then 'Sousse'
      else city
    end
  )
where (region is null or city is null)
  and location ilike '%Sousse%';
