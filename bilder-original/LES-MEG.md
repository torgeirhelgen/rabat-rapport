# Originalbilder

Legg originalbildene i én undermappe per kapittel:

```
bilder-original/
  infrastruktur/
  kompleks/
  lnfp/
  akademi/
```

Kjør deretter `npm run bilder`. Bildene gjøres om til WebP i tre størrelser,
metadata (også GPS) fjernes, og `public/bilder/bilder.json` oppdateres.
Rekkefølgen i bildevelgeren følger filnavnene (gi dem gjerne prefiks 01-, 02- …).

Originalene sjekkes ikke inn i git (se .gitignore), bare de ferdige WebP-filene.
