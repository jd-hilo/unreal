# This or That Interest Questions - Photo Guide

## Database Schema
The `interest_responses` table has the following columns for images:
- `option_a_image_url` (text, NOT NULL) - URL for option A image
- `option_b_image_url` (text, NOT NULL) - URL for option B image  
- `option_a_description` (text, nullable) - Description of option A image
- `option_b_description` (text, nullable) - Description of option B image

**Note:** Images are stored as URLs (e.g., from Unsplash or your image hosting service). The descriptions are stored for AI analysis but not displayed to users.

---

## Category: Fashion

### Options with Photo Descriptions:

1. **Casual**
   - Photo: Relaxed, everyday clothing - jeans, t-shirts, sneakers, comfortable outfits
   - Description: "Casual everyday fashion - comfortable and relaxed style"

2. **Formal**
   - Photo: Business suits, evening wear, elegant dresses, formal attire
   - Description: "Formal attire - professional and elegant clothing"

3. **Streetwear**
   - Photo: Urban fashion, hoodies, sneakers, street style, hip-hop influenced
   - Description: "Streetwear fashion - urban and contemporary style"

4. **Vintage**
   - Photo: Retro clothing, 70s/80s/90s fashion, thrifted looks, classic pieces
   - Description: "Vintage fashion - retro and nostalgic clothing styles"

5. **Minimalist**
   - Photo: Simple, clean lines, neutral colors, basic pieces, capsule wardrobe
   - Description: "Minimalist fashion - simple, clean, and essential pieces"

6. **Bohemian**
   - Photo: Flowing fabrics, patterns, layered jewelry, free-spirited style
   - Description: "Bohemian fashion - free-spirited and artistic style"

7. **Athletic**
   - Photo: Sportswear, activewear, gym clothes, athletic shoes
   - Description: "Athletic fashion - sportswear and activewear"

8. **Designer**
   - Photo: High-end luxury brands, runway fashion, expensive clothing
   - Description: "Designer fashion - luxury and high-end clothing"

9. **Sustainable**
   - Photo: Eco-friendly clothing, organic materials, ethical fashion
   - Description: "Sustainable fashion - eco-friendly and ethical clothing"

10. **Classic**
    - Photo: Timeless pieces, traditional styles, preppy looks
    - Description: "Classic fashion - timeless and traditional style"

11. **Trendy**
    - Photo: Current fashion trends, latest styles, Instagram-worthy outfits
    - Description: "Trendy fashion - current and popular styles"

12. **Elegant**
    - Photo: Sophisticated, refined, polished looks, evening wear
    - Description: "Elegant fashion - sophisticated and refined style"

13. **Comfortable**
    - Photo: Cozy clothing, soft fabrics, relaxed fits, loungewear
    - Description: "Comfortable fashion - cozy and relaxed clothing"

14. **Bold**
    - Photo: Bright colors, statement pieces, eye-catching patterns
    - Description: "Bold fashion - vibrant and statement-making style"

15. **Neutral**
    - Photo: Beige, gray, black, white - muted color palette
    - Description: "Neutral fashion - muted and understated colors"

16. **Colorful**
    - Photo: Bright, vibrant colors, rainbow hues, colorful outfits
    - Description: "Colorful fashion - vibrant and bright colors"

17. **Monochrome**
    - Photo: Single color outfits, black and white, tonal dressing
    - Description: "Monochrome fashion - single color or tonal outfits"

18. **Layered**
    - Photo: Multiple layers, jackets over sweaters, textured combinations
    - Description: "Layered fashion - multiple pieces worn together"

19. **Accessorized**
    - Photo: Lots of jewelry, bags, hats, scarves, accessories
    - Description: "Accessorized fashion - heavily accessorized outfits"

20. **Simple**
    - Photo: Basic pieces, minimal accessories, clean looks
    - Description: "Simple fashion - basic and uncomplicated style"

---

## Category: Food Types

### Options with Photo Descriptions:

1. **Italian**
   - Photo: Pizza, pasta, risotto, Italian cuisine, Italian restaurant
   - Description: "Italian cuisine - pasta, pizza, and traditional Italian dishes"

2. **Mexican**
   - Photo: Tacos, burritos, nachos, Mexican food, vibrant colors
   - Description: "Mexican cuisine - tacos, burritos, and spicy Mexican dishes"

3. **Japanese**
   - Photo: Sushi, ramen, tempura, Japanese cuisine, bento boxes
   - Description: "Japanese cuisine - sushi, ramen, and traditional Japanese food"

4. **Thai**
   - Photo: Pad Thai, curry, Thai food, spicy dishes, colorful presentation
   - Description: "Thai cuisine - spicy and flavorful Thai dishes"

5. **Indian**
   - Photo: Curry, naan, biryani, Indian food, spices
   - Description: "Indian cuisine - curry, spices, and traditional Indian dishes"

6. **Chinese**
   - Photo: Dim sum, stir fry, Chinese food, dumplings
   - Description: "Chinese cuisine - dim sum, stir fry, and Chinese dishes"

7. **French**
   - Photo: Croissants, escargot, French cuisine, elegant presentation
   - Description: "French cuisine - elegant and refined French dishes"

8. **Mediterranean**
   - Photo: Greek salad, hummus, olives, Mediterranean food
   - Description: "Mediterranean cuisine - healthy and fresh Mediterranean dishes"

9. **American**
   - Photo: Burgers, fries, BBQ, American comfort food
   - Description: "American cuisine - burgers, BBQ, and comfort food"

10. **Korean**
    - Photo: Korean BBQ, kimchi, bibimbap, Korean food
    - Description: "Korean cuisine - Korean BBQ, kimchi, and Korean dishes"

11. **Vietnamese**
    - Photo: Pho, banh mi, spring rolls, Vietnamese food
    - Description: "Vietnamese cuisine - pho, banh mi, and Vietnamese dishes"

12. **Greek**
    - Photo: Gyros, Greek salad, souvlaki, Greek food
    - Description: "Greek cuisine - gyros, Greek salad, and Greek dishes"

13. **Spanish**
    - Photo: Paella, tapas, Spanish food, sangria
    - Description: "Spanish cuisine - paella, tapas, and Spanish dishes"

14. **Lebanese**
    - Photo: Hummus, falafel, shawarma, Lebanese food
    - Description: "Lebanese cuisine - hummus, falafel, and Middle Eastern dishes"

15. **Ethiopian**
    - Photo: Injera, Ethiopian food, traditional platters
    - Description: "Ethiopian cuisine - injera and traditional Ethiopian dishes"

16. **Brazilian**
    - Photo: Feijoada, Brazilian BBQ, Brazilian food
    - Description: "Brazilian cuisine - feijoada and Brazilian dishes"

17. **Moroccan**
    - Photo: Tagine, couscous, Moroccan food, spices
    - Description: "Moroccan cuisine - tagine, couscous, and Moroccan dishes"

18. **Turkish**
    - Photo: Kebabs, Turkish delight, Turkish food
    - Description: "Turkish cuisine - kebabs and Turkish dishes"

19. **Caribbean**
    - Photo: Jerk chicken, Caribbean food, tropical flavors
    - Description: "Caribbean cuisine - jerk chicken and Caribbean dishes"

20. **Fusion**
    - Photo: Fusion cuisine, creative combinations, modern food
    - Description: "Fusion cuisine - creative combinations of different cuisines"

---

## Category: Song Genres

### Options with Photo Descriptions:

1. **Pop**
   - Photo: Pop music artists, upbeat music, radio hits, pop concerts
   - Description: "Pop music - mainstream, catchy, and popular songs"

2. **Rock**
   - Photo: Rock bands, electric guitars, rock concerts, rock music
   - Description: "Rock music - guitar-driven, energetic rock songs"

3. **Hip Hop**
   - Photo: Hip hop artists, rap music, urban culture, hip hop style
   - Description: "Hip hop music - rap and urban hip hop culture"

4. **Jazz**
   - Photo: Jazz musicians, saxophones, jazz clubs, smooth jazz
   - Description: "Jazz music - smooth, improvisational jazz"

5. **Classical**
   - Photo: Orchestras, classical musicians, concert halls, classical instruments
   - Description: "Classical music - orchestral and traditional classical"

6. **Electronic**
   - Photo: DJs, electronic music, synthesizers, EDM festivals
   - Description: "Electronic music - electronic beats and EDM"

7. **Country**
   - Photo: Country singers, guitars, country music, western style
   - Description: "Country music - country and western songs"

8. **R&B**
   - Photo: R&B singers, soulful music, R&B concerts
   - Description: "R&B music - rhythm and blues, soulful R&B"

9. **Reggae**
   - Photo: Reggae artists, Caribbean music, reggae style
   - Description: "Reggae music - reggae and Caribbean rhythms"

10. **Blues**
    - Photo: Blues musicians, guitars, blues clubs, blues music
    - Description: "Blues music - traditional and soulful blues"

11. **Folk**
    - Photo: Folk singers, acoustic guitars, folk music, storytelling
    - Description: "Folk music - acoustic and storytelling folk songs"

12. **Metal**
    - Photo: Metal bands, heavy metal, metal concerts, intense music
    - Description: "Metal music - heavy and intense metal"

13. **Punk**
    - Photo: Punk bands, punk style, energetic punk music
    - Description: "Punk music - energetic and rebellious punk"

14. **Indie**
    - Photo: Indie artists, independent music, indie concerts
    - Description: "Indie music - independent and alternative indie"

15. **Alternative**
    - Photo: Alternative rock, alternative music, diverse styles
    - Description: "Alternative music - alternative rock and diverse styles"

16. **Dance**
    - Photo: Dance music, club music, dance floors, upbeat
    - Description: "Dance music - upbeat and danceable songs"

17. **House**
    - Photo: House music, electronic dance, house DJs
    - Description: "House music - electronic house and dance music"

18. **Techno**
    - Photo: Techno music, electronic beats, techno festivals
    - Description: "Techno music - electronic and repetitive techno"

19. **Soul**
    - Photo: Soul singers, soul music, emotional and powerful
    - Description: "Soul music - emotional and powerful soul"

20. **Funk**
    - Photo: Funk music, funky beats, groovy music
    - Description: "Funk music - groovy and funky rhythms"

---

## Category: Song Artists

### Options with Photo Descriptions:

1. **The Beatles**
   - Photo: The Beatles band, Beatles album covers, Beatles memorabilia
   - Description: "The Beatles - iconic British rock band"

2. **Taylor Swift**
   - Photo: Taylor Swift performing, Taylor Swift albums, pop star
   - Description: "Taylor Swift - pop and country pop singer-songwriter"

3. **Drake**
   - Photo: Drake performing, Drake albums, hip hop artist
   - Description: "Drake - Canadian rapper and hip hop artist"

4. **Beyoncé**
   - Photo: Beyoncé performing, Beyoncé albums, R&B superstar
   - Description: "Beyoncé - R&B and pop superstar"

5. **Ed Sheeran**
   - Photo: Ed Sheeran performing, acoustic guitar, singer-songwriter
   - Description: "Ed Sheeran - British singer-songwriter"

6. **Ariana Grande**
   - Photo: Ariana Grande performing, pop star, pop music
   - Description: "Ariana Grande - pop singer and actress"

7. **The Weeknd**
   - Photo: The Weeknd performing, R&B artist, pop music
   - Description: "The Weeknd - Canadian R&B and pop artist"

8. **Billie Eilish**
   - Photo: Billie Eilish performing, alternative pop, young artist
   - Description: "Billie Eilish - alternative pop singer-songwriter"

9. **Post Malone**
   - Photo: Post Malone performing, hip hop, pop rap
   - Description: "Post Malone - rapper and singer-songwriter"

10. **Dua Lipa**
    - Photo: Dua Lipa performing, pop star, dance pop
    - Description: "Dua Lipa - British pop and dance-pop singer"

11. **Harry Styles**
    - Photo: Harry Styles performing, pop rock, former One Direction
    - Description: "Harry Styles - pop rock singer and former One Direction member"

12. **Bad Bunny**
    - Photo: Bad Bunny performing, reggaeton, Latin music
    - Description: "Bad Bunny - Puerto Rican reggaeton and Latin trap artist"

13. **Olivia Rodrigo**
    - Photo: Olivia Rodrigo performing, pop rock, young artist
    - Description: "Olivia Rodrigo - pop rock singer-songwriter"

14. **The Rolling Stones**
    - Photo: The Rolling Stones band, classic rock, rock legends
    - Description: "The Rolling Stones - iconic British rock band"

15. **Queen**
    - Photo: Queen band, Freddie Mercury, classic rock
    - Description: "Queen - British rock band led by Freddie Mercury"

16. **Michael Jackson**
    - Photo: Michael Jackson performing, pop icon, King of Pop
    - Description: "Michael Jackson - pop icon and King of Pop"

17. **Prince**
    - Photo: Prince performing, funk rock, purple rain
    - Description: "Prince - funk rock artist and musician"

18. **David Bowie**
    - Photo: David Bowie, glam rock, iconic artist
    - Description: "David Bowie - British rock and glam rock icon"

19. **Radiohead**
    - Photo: Radiohead band, alternative rock, experimental
    - Description: "Radiohead - British alternative rock band"

20. **Kendrick Lamar**
    - Photo: Kendrick Lamar performing, hip hop, rap artist
    - Description: "Kendrick Lamar - American rapper and hip hop artist"

---

## Category: Cities

### Options with Photo Descriptions:

1. **New York**
   - Photo: NYC skyline, Statue of Liberty, Times Square, Manhattan
   - Description: "New York City - iconic skyline and urban landscape"

2. **London**
   - Photo: Big Ben, London Eye, Thames River, British architecture
   - Description: "London - historic British capital with iconic landmarks"

3. **Paris**
   - Photo: Eiffel Tower, Paris streets, French architecture, Seine River
   - Description: "Paris - City of Light with Eiffel Tower and French charm"

4. **Tokyo**
   - Photo: Tokyo skyline, neon lights, modern architecture, Shibuya
   - Description: "Tokyo - modern Japanese metropolis with neon lights"

5. **Los Angeles**
   - Photo: Hollywood sign, LA skyline, beaches, palm trees
   - Description: "Los Angeles - Hollywood, beaches, and California lifestyle"

6. **Sydney**
   - Photo: Sydney Opera House, Harbour Bridge, Australian city
   - Description: "Sydney - iconic Opera House and harbor views"

7. **Barcelona**
   - Photo: Sagrada Familia, Barcelona architecture, Spanish city
   - Description: "Barcelona - Gaudi architecture and Spanish culture"

8. **Amsterdam**
   - Photo: Canals, Dutch architecture, bicycles, Amsterdam streets
   - Description: "Amsterdam - canals, bikes, and Dutch architecture"

9. **Berlin**
   - Photo: Berlin Wall, modern architecture, German city
   - Description: "Berlin - historic and modern German capital"

10. **Rome**
    - Photo: Colosseum, ancient ruins, Italian architecture, Roman history
    - Description: "Rome - ancient history and Italian architecture"

11. **Dubai**
    - Photo: Burj Khalifa, modern skyscrapers, luxury, desert city
    - Description: "Dubai - modern skyscrapers and luxury architecture"

12. **Singapore**
    - Photo: Marina Bay Sands, modern city, Asian metropolis
    - Description: "Singapore - modern Asian city-state"

13. **San Francisco**
    - Photo: Golden Gate Bridge, hills, cable cars, California city
    - Description: "San Francisco - Golden Gate Bridge and hilly streets"

14. **Chicago**
    - Photo: Chicago skyline, architecture, Lake Michigan, Windy City
    - Description: "Chicago - impressive skyline and architecture"

15. **Miami**
    - Photo: Miami Beach, Art Deco, palm trees, tropical city
    - Description: "Miami - beaches, Art Deco, and tropical vibe"

16. **Toronto**
    - Photo: CN Tower, Canadian city, diverse architecture
    - Description: "Toronto - CN Tower and diverse Canadian city"

17. **Vancouver**
    - Photo: Mountains, ocean, Canadian city, natural beauty
    - Description: "Vancouver - mountains, ocean, and natural beauty"

18. **Melbourne**
    - Photo: Australian city, modern architecture, cultural hub
    - Description: "Melbourne - Australian cultural and modern city"

19. **Bangkok**
    - Photo: Thai temples, bustling streets, Asian city
    - Description: "Bangkok - Thai temples and bustling Asian city"

20. **Istanbul**
    - Photo: Hagia Sophia, Bosphorus, Turkish city, historic
    - Description: "Istanbul - historic Turkish city bridging Europe and Asia"

---

## Category: Music (General)

### Options with Photo Descriptions:

1. **Live Concerts**
   - Photo: Concert stage, live performance, crowd, musicians performing
   - Description: "Live concerts - experiencing music in person at venues"

2. **Music Festivals**
   - Photo: Festival stages, crowds, outdoor music events, Coachella-style
   - Description: "Music festivals - outdoor multi-day music events"

3. **Vinyl Records**
   - Photo: Vinyl records, turntables, record players, album covers
   - Description: "Vinyl records - physical music format and collecting"

4. **Streaming**
   - Photo: Spotify, Apple Music, streaming apps, digital music
   - Description: "Music streaming - digital music platforms and apps"

5. **Radio**
   - Photo: Radio, radio waves, traditional radio listening
   - Description: "Radio - traditional radio listening and discovery"

6. **Podcasts**
   - Photo: Podcast microphones, podcast apps, audio content
   - Description: "Podcasts - audio content and podcast listening"

7. **Music Videos**
   - Photo: Music video production, visual music, YouTube
   - Description: "Music videos - visual music content and production"

8. **Karaoke**
   - Photo: Karaoke machines, singing, microphones, fun singing
   - Description: "Karaoke - singing along to music with friends"

9. **Music Production**
   - Photo: Recording studio, mixing boards, music creation
   - Description: "Music production - creating and producing music"

10. **DJ Sets**
    - Photo: DJ decks, turntables, DJ performing, electronic music
    - Description: "DJ sets - DJ performances and electronic music mixing"

11. **Acoustic**
    - Photo: Acoustic guitars, unplugged music, intimate performances
    - Description: "Acoustic music - unplugged and intimate performances"

12. **Symphony**
    - Photo: Orchestras, symphony halls, classical music performance
    - Description: "Symphony - orchestral classical music performances"

13. **Opera**
    - Photo: Opera houses, opera singers, classical opera performance
    - Description: "Opera - classical opera performances and venues"

14. **Jazz Clubs**
    - Photo: Intimate jazz venues, jazz musicians, cozy atmosphere
    - Description: "Jazz clubs - intimate jazz performances in clubs"

15. **Underground**
    - Photo: Underground music scene, indie venues, alternative music
    - Description: "Underground music - indie and alternative music scenes"

16. **Mainstream**
    - Photo: Popular music, radio hits, commercial music
    - Description: "Mainstream music - popular and commercial music"

17. **Indie Labels**
    - Photo: Independent record labels, indie music, alternative
    - Description: "Indie labels - independent music labels and artists"

18. **Major Labels**
    - Photo: Big record labels, commercial music industry
    - Description: "Major labels - large commercial record labels"

19. **Music Discovery**
    - Photo: Finding new music, music exploration, new artists
    - Description: "Music discovery - finding and exploring new music"

20. **Classic Hits**
    - Photo: Classic songs, timeless music, old favorites
    - Description: "Classic hits - timeless and classic songs"

---

## How Questions Are Generated

The system randomly pairs any two options from the same category. For example:
- "Casual" vs "Formal" (Fashion)
- "Italian" vs "Japanese" (Food)
- "Pop" vs "Rock" (Music Genres)
- etc.

Each user response creates a new row in the `interest_responses` table with:
- The two options shown
- Their respective image URLs
- Their descriptions (for AI analysis)
- Which option the user selected

---

## Notes for Intern

1. **Image URLs**: Store full URLs to images (e.g., Unsplash URLs or your image hosting service)
2. **Descriptions**: Keep descriptions concise but descriptive for AI analysis
3. **Image Quality**: Use high-quality images that clearly represent each option
4. **Consistency**: Maintain consistent style across images within the same category
5. **Public Domain**: Ensure images are from public domain or properly licensed sources


