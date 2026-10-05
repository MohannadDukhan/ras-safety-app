insert into public.sites (name)
select initial_sites.name
from (
  values
    ('Royal Commons'),
    ('Echo Townhouses'),
    ('McCallum Lands')
) as initial_sites (name)
where not exists (
  select 1 from public.sites
  where sites.name = initial_sites.name
);
