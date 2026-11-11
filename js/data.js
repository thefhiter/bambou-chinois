// Lesson content — Leçon 2 « 你是哪国人? » (manuel de chinois, 3ème année secondaire).
// Every text has fr / ar / en variants.

const T = (fr, ar, en) => ({ fr, ar, en });

/* ---------- Characters to WRITE (ordered from simplest to hardest) ---------- */
export const CHARS = [
  { c: '人', py: 'rén', m: T('personne', 'شخص، إنسان', 'person'),
    hint: T('Une personne qui marche : deux jambes écartées.', 'شخص يمشي: ساقان متباعدتان.', 'A person walking: two legs apart.') },
  { c: '小', py: 'xiǎo', m: T('petit', 'صغير', 'small'),
    hint: T('Un trait au milieu et deux petits points : quelque chose de tout petit.', 'خط في الوسط ونقطتان صغيرتان: شيء صغير جدًّا.', 'A middle stroke with two tiny dots: something very small.') },
  { c: '女', py: 'nǚ', m: T('femme, fille', 'امرأة، فتاة', 'woman, girl'),
    hint: T('Une femme assise, les bras croisés.', 'امرأة جالسة وذراعاها متقاطعتان.', 'A woman sitting with crossed arms.') },
  { c: '不', py: 'bù', m: T('ne… pas, non', 'لا، ليس', 'not, no'),
    hint: T('Un oiseau qui monte vers le ciel mais est bloqué par le trait du haut : « non ! ».', 'طائر يصعد نحو السماء لكن الخط العلوي يمنعه: «لا!».', 'A bird flying up but blocked by the top line: "no!".') },
  { c: '也', py: 'yě', m: T('aussi', 'أيضًا', 'also, too'),
    hint: T('3 traits seulement. On le retrouve dans 她 (elle).', 'ثلاثة خطوط فقط. نجده داخل 她 (هي).', 'Only 3 strokes. You will find it again inside 她 (she).') },
  { c: '中', py: 'zhōng', m: T('milieu, centre', 'وسط، مركز', 'middle, centre'),
    hint: T('Une flèche qui traverse la cible en plein milieu. 中国 = le pays du milieu.', 'سهم يخترق الهدف في وسطه. 中国 = بلد الوسط.', 'An arrow through the middle of a target. 中国 = the middle country.') },
  { c: '么', py: 'me', m: T('(suffixe de 什么)', '(لاحقة في 什么)', '(suffix in 什么)'),
    hint: T('Ton neutre, court et léger. Toujours après 什 : 什么.', 'نغمة محايدة قصيرة وخفيفة. دائمًا بعد 什: 什么.', 'Neutral tone, short and light. Always after 什: 什么.') },
  { c: '友', py: 'yǒu', m: T('ami', 'صديق', 'friend'),
    hint: T('Deux mains qui se serrent : l’amitié.', 'يدان تتصافحان: الصداقة.', 'Two hands shaking: friendship.') },
  { c: '叫', py: 'jiào', m: T('s’appeler, appeler', 'يُسمّى، ينادي', 'to be called, to call'),
    hint: T('口 (la bouche) à gauche : on appelle quelqu’un avec la bouche.', '口 (الفم) على اليسار: ننادي بالفم.', '口 (mouth) on the left: you call someone with your mouth.') },
  { c: '什', py: 'shén', m: T('quoi (dans 什么)', 'ماذا (في 什么)', 'what (in 什么)'),
    hint: T('亻(personne) + 十 (dix) : dix personnes… « quoi ? ».', '亻(شخص) + 十 (عشرة): عشرة أشخاص… «ماذا؟».', '亻(person) + 十 (ten): ten people… "what?".') },
  { c: '好', py: 'hǎo', m: T('bon, bien', 'جيّد، حسن', 'good, well'),
    hint: T('女 (femme) + 子 (enfant) : une mère et son enfant, c’est « bien ».', '女 (امرأة) + 子 (طفل): أمّ وطفلها، هذا «جيّد».', '女 (woman) + 子 (child): a mother with her child is "good".') },
  { c: '她', py: 'tā', m: T('elle', 'هي', 'she, her'),
    hint: T('女 (femme) + 也 (aussi) : « elle ».', '女 (امرأة) + 也 (أيضًا): «هي».', '女 (woman) + 也 (also): "she".') },
  { c: '名', py: 'míng', m: T('nom', 'اسم', 'name'),
    hint: T('夕 (soir) + 口 (bouche) : la nuit, on dit son nom pour se reconnaître.', '夕 (المساء) + 口 (الفم): في الليل نقول اسمنا ليعرفنا الآخرون.', '夕 (evening) + 口 (mouth): at night you say your name to be recognised.') },
  { c: '字', py: 'zì', m: T('caractère, mot écrit', 'حرف، كلمة مكتوبة', 'character, written word'),
    hint: T('Un enfant 子 sous un toit 宀 : il apprend à écrire.', 'طفل 子 تحت سقف 宀: يتعلّم الكتابة.', 'A child 子 under a roof 宀: learning to write.') },
  { c: '问', py: 'wèn', m: T('demander, questionner', 'يسأل', 'to ask'),
    hint: T('Une bouche 口 dans une porte 门 : on frappe à la porte pour demander.', 'فم 口 داخل باب 门: نطرق الباب لنسأل.', 'A mouth 口 in a doorway 门: asking at the door.') },
  { c: '吗', py: 'ma', m: T('(particule de question oui/non)', '(أداة استفهام: هل؟)', '(yes/no question particle)'),
    hint: T('口 (bouche) + 马 (mǎ, cheval) qui donne le son « ma ».', '口 (فم) + 马 (mǎ، حصان) الذي يعطي الصوت «ma».', '口 (mouth) + 马 (mǎ, horse) giving the sound "ma".') },
  { c: '你', py: 'nǐ', m: T('tu, toi', 'أنتَ / أنتِ', 'you'),
    hint: T('亻(personne) à gauche : la personne en face de moi, « toi ».', '亻(شخص) على اليسار: الشخص الذي أمامي، «أنت».', '亻(person) on the left: the person facing me, "you".') },
  { c: '我', py: 'wǒ', m: T('je, moi', 'أنا', 'I, me'),
    hint: T('Une main 手 qui tient une lance 戈 : « moi », je me défends.', 'يد 手 تمسك رمحًا 戈: «أنا» أدافع عن نفسي.', 'A hand 手 holding a spear 戈: "me", standing my ground.') },
  { c: '朋', py: 'péng', m: T('ami', 'صديق', 'friend'),
    hint: T('Deux 月 côte à côte : deux amis qui marchent ensemble.', 'اثنان من 月 جنبًا إلى جنب: صديقان يمشيان معًا.', 'Two 月 side by side: two friends walking together.') },
  { c: '国', py: 'guó', m: T('pays', 'بلد، دولة', 'country'),
    hint: T('Un trésor de jade 玉 protégé par des frontières 囗 : un pays.', 'كنز من اليشم 玉 تحميه حدود 囗: بلد.', 'A jade treasure 玉 protected by borders 囗: a country.') },
  { c: '法', py: 'fǎ', m: T('loi ; France (法国)', 'قانون؛ فرنسا (法国)', 'law; France (法国)'),
    hint: T('氵(eau) + 去 (aller) : la loi coule comme l’eau. « Fǎ » imite « Fra-nce ».', '氵(ماء) + 去 (يذهب): القانون يجري كالماء. «Fǎ» تحاكي «فرنسا».', '氵(water) + 去 (go): law flows like water. "Fǎ" imitates "France".') },
  { c: '是', py: 'shì', m: T('être', 'يكون (هو / هي)', 'to be'),
    hint: T('Le soleil 日 au-dessus de ce qui est droit 正 : ce qui « est » vrai.', 'الشمس 日 فوق ما هو مستقيم 正: ما «يكون» صحيحًا.', 'The sun 日 above what is upright 正: what "is" true.') },
  { c: '呢', py: 'ne', m: T('et (toi) ? (particule)', 'وأنت؟ (أداة)', 'and (you)? (particle)'),
    hint: T('口 (bouche) + 尼 (ní) pour le son. 你呢? = Et toi ?', '口 (فم) + 尼 (ní) للصوت. 你呢? = وأنت؟', '口 (mouth) + 尼 (ní) for the sound. 你呢? = And you?') },
  { c: '美', py: 'měi', m: T('beau ; Amérique (美国)', 'جميل؛ أمريكا (美国)', 'beautiful; America (美国)'),
    hint: T('Un grand 大 mouton 羊 : pour les anciens Chinois, c’était « beau ».', 'خروف 羊 كبير 大: عند الصينيين القدامى كان ذلك «جميلًا».', 'A big 大 sheep 羊: "beautiful" for the ancient Chinese.') },
  { c: '哪', py: 'nǎ', m: T('quel, lequel', 'أيّ', 'which'),
    hint: T('口 (bouche : c’est une question) + 那 (nà, « celui-là ») : lequel ?', '口 (فم: سؤال) + 那 (nà، «ذاك»): أيّ واحد؟', '口 (mouth: a question) + 那 (nà, "that one"): which one?') },
  { c: '请', py: 'qǐng', m: T('s’il vous plaît ; inviter', 'من فضلك؛ يدعو', 'please; to invite'),
    hint: T('讠(parole) + 青 (qīng) pour le son : des paroles polies.', '讠(كلام) + 青 (qīng) للصوت: كلام مهذّب.', '讠(speech) + 青 (qīng) for the sound: polite words.') },
  { c: '谁', py: 'shéi', m: T('qui', 'مَن', 'who'),
    hint: T('讠(parole) + 隹 (oiseau) : « qui » parle comme un oiseau ?', '讠(كلام) + 隹 (طائر): «من» يتكلّم كالطائر؟', '讠(speech) + 隹 (bird): "who" is chattering like a bird?') },
];

// Characters you only need to recognise (country names, first names).
export const EXTRA_CHARS = '日本突尼斯印度意大利西班牙德英澳亚萨米玛丽';

/* ---------- Vocabulary ---------- */
export const WORDS = [
  { id: 'wo', hz: '我', py: 'wǒ', m: T('je, moi', 'أنا', 'I, me') },
  { id: 'ni', hz: '你', py: 'nǐ', m: T('tu, toi', 'أنتَ / أنتِ', 'you') },
  { id: 'ta', hz: '她', py: 'tā', m: T('elle', 'هي', 'she') },
  { id: 'shi', hz: '是', py: 'shì', m: T('être', 'يكون', 'to be') },
  { id: 'ren', hz: '人', py: 'rén', m: T('personne', 'شخص', 'person') },
  { id: 'hao', hz: '好', py: 'hǎo', m: T('bon, bien', 'جيّد', 'good') },
  { id: 'haoren', hz: '好人', py: 'hǎo rén', m: T('quelqu’un de bien', 'شخص طيّب', 'a good person') },
  { id: 'guo', hz: '国', py: 'guó', m: T('pays', 'بلد', 'country') },
  { id: 'zhongguo', hz: '中国', py: 'Zhōngguó', m: T('la Chine', 'الصين', 'China') },
  { id: 'zhongguoren', hz: '中国人', py: 'Zhōngguórén', m: T('Chinois(e)', 'صيني / صينية', 'Chinese (person)') },
  { id: 'tunisi', hz: '突尼斯', py: 'Tūnísī', m: T('la Tunisie', 'تونس', 'Tunisia') },
  { id: 'tunisiren', hz: '突尼斯人', py: 'Tūnísīrén', m: T('Tunisien(ne)', 'تونسي / تونسية', 'Tunisian') },
  { id: 'faguo', hz: '法国', py: 'Fǎguó', m: T('la France', 'فرنسا', 'France') },
  { id: 'faguoren', hz: '法国人', py: 'Fǎguórén', m: T('Français(e)', 'فرنسي / فرنسية', 'French (person)') },
  { id: 'meiguo', hz: '美国', py: 'Měiguó', m: T('l’Amérique (USA)', 'أمريكا', 'America (USA)') },
  { id: 'meiguoren', hz: '美国人', py: 'Měiguórén', m: T('Américain(e)', 'أمريكي / أمريكية', 'American') },
  { id: 'riben', hz: '日本', py: 'Rìběn', m: T('le Japon', 'اليابان', 'Japan') },
  { id: 'ribenren', hz: '日本人', py: 'Rìběnrén', m: T('Japonais(e)', 'ياباني / يابانية', 'Japanese (person)') },
  { id: 'yindu', hz: '印度', py: 'Yìndù', m: T('l’Inde', 'الهند', 'India') },
  { id: 'yinduren', hz: '印度人', py: 'Yìndùrén', m: T('Indien(ne)', 'هندي / هندية', 'Indian') },
  { id: 'na', hz: '哪', py: 'nǎ', m: T('quel, lequel', 'أيّ', 'which') },
  { id: 'naguo', hz: '哪国', py: 'nǎ guó', m: T('quel pays', 'أيّ بلد', 'which country') },
  { id: 'naguoren', hz: '哪国人', py: 'nǎ guó rén', m: T('de quelle nationalité', 'من أيّ بلد (جنسية)', 'what nationality') },
  { id: 'ne', hz: '呢', py: 'ne', m: T('et… ? (particule)', 'و…؟ (أداة)', 'and…? (particle)') },
  { id: 'nine', hz: '你呢', py: 'nǐ ne', m: T('et toi ?', 'وأنت؟', 'and you?') },
  { id: 'shei', hz: '谁', py: 'shéi', m: T('qui', 'مَن', 'who') },
  { id: 'nv', hz: '女', py: 'nǚ', m: T('femme, fille, féminin', 'امرأة، مؤنّث', 'woman, female') },
  { id: 'pengyou', hz: '朋友', py: 'péngyou', m: T('ami', 'صديق', 'friend') },
  { id: 'nvpengyou', hz: '女朋友', py: 'nǚ péngyou', m: T('amie (petite amie)', 'صديقة', 'girlfriend, female friend') },
  { id: 'wonvpengyou', hz: '我女朋友', py: 'wǒ nǚ péngyou', m: T('mon amie', 'صديقتي', 'my girlfriend') },
  { id: 'jiao', hz: '叫', py: 'jiào', m: T('s’appeler', 'يُسمّى', 'to be called') },
  { id: 'shenme', hz: '什么', py: 'shénme', m: T('quoi, quel', 'ماذا، ما', 'what') },
  { id: 'mingzi', hz: '名字', py: 'míngzi', m: T('nom, prénom', 'اسم', 'name') },
  { id: 'shenmemingzi', hz: '什么名字', py: 'shénme míngzi', m: T('quel nom', 'ما الاسم', 'what name') },
  { id: 'qing', hz: '请', py: 'qǐng', m: T('s’il vous plaît ; inviter', 'من فضلك؛ يدعو', 'please; to invite') },
  { id: 'wen', hz: '问', py: 'wèn', m: T('demander', 'يسأل', 'to ask') },
  { id: 'qingwen', hz: '请问', py: 'qǐng wèn', m: T('excusez-moi, puis-je demander…', 'من فضلك، هل لي أن أسأل…', 'excuse me, may I ask…') },
  { id: 'bu', hz: '不', py: 'bù', m: T('ne… pas, non', 'لا، ليس', 'not, no') },
  { id: 'bushi', hz: '不是', py: 'bú shì', m: T('ne pas être', 'ليس', 'is not') },
  { id: 'ye', hz: '也', py: 'yě', m: T('aussi', 'أيضًا', 'also') },
  { id: 'ma', hz: '吗', py: 'ma', m: T('est-ce que… ? (particule)', 'هل…؟ (أداة)', '…? (question particle)') },
  { id: 'yidali', hz: '意大利', py: 'Yìdàlì', m: T('l’Italie', 'إيطاليا', 'Italy') },
  { id: 'xibanya', hz: '西班牙', py: 'Xībānyá', m: T('l’Espagne', 'إسبانيا', 'Spain') },
  { id: 'deguo', hz: '德国', py: 'Déguó', m: T('l’Allemagne', 'ألمانيا', 'Germany') },
  { id: 'yingguo', hz: '英国', py: 'Yīngguó', m: T('l’Angleterre', 'إنجلترا', 'England') },
  { id: 'aodaliya', hz: '澳大利亚', py: 'Àodàlìyà', m: T('l’Australie', 'أستراليا', 'Australia') },
  { id: 'sami', hz: '萨米', py: 'Sàmǐ', m: T('Sami (prénom)', 'سامي (اسم)', 'Sami (name)') },
  { id: 'xiaomei', hz: '小美', py: 'Xiǎoměi', m: T('Xiaomei (prénom)', 'شياو ماي (اسم)', 'Xiaomei (name)') },
  { id: 'mali', hz: '玛丽', py: 'Mǎlì', m: T('Marie (prénom)', 'ماري (اسم)', 'Mary (name)') },
];

/* ---------- Sentences ---------- */
export const SENTENCES = [
  { id: 's_nishi', hz: '你是哪国人?', py: 'Nǐ shì nǎ guó rén?', tiles: ['你', '是', '哪', '国', '人'],
    m: T('Tu es de quelle nationalité ?', 'من أيّ بلد أنت؟', 'What nationality are you?') },
  { id: 's_wozg', hz: '我是中国人。', py: 'Wǒ shì Zhōngguórén.', tiles: ['我', '是', '中国', '人'],
    m: T('Je suis chinois(e).', 'أنا صيني / صينية.', 'I am Chinese.') },
  { id: 's_nine', hz: '你呢?', py: 'Nǐ ne?', tiles: ['你', '呢'],
    m: T('Et toi ?', 'وأنت؟', 'And you?') },
  { id: 's_wotn', hz: '我是突尼斯人。', py: 'Wǒ shì Tūnísīrén.', tiles: ['我', '是', '突尼斯', '人'],
    m: T('Je suis tunisien(ne).', 'أنا تونسي / تونسية.', 'I am Tunisian.') },
  { id: 's_tashei', hz: '她是谁?', py: 'Tā shì shéi?', tiles: ['她', '是', '谁'],
    m: T('Qui est-elle ?', 'من هي؟', 'Who is she?') },
  { id: 's_tanvpy', hz: '她是我女朋友。', py: 'Tā shì wǒ nǚ péngyou.', tiles: ['她', '是', '我', '女', '朋友'],
    m: T('C’est mon amie.', 'هي صديقتي.', 'She is my girlfriend.') },
  { id: 's_tajiao', hz: '她叫什么名字?', py: 'Tā jiào shénme míngzi?', tiles: ['她', '叫', '什么', '名字'],
    m: T('Comment s’appelle-t-elle ?', 'ما اسمها؟', 'What is her name?') },
  { id: 's_tamali', hz: '她叫玛丽。', py: 'Tā jiào Mǎlì.', tiles: ['她', '叫', '玛丽'],
    m: T('Elle s’appelle Marie.', 'اسمها ماري.', 'Her name is Mary.') },
  { id: 's_niyema', hz: '请问,你也是突尼斯人吗?', py: 'Qǐng wèn, nǐ yě shì Tūnísīrén ma?', tiles: ['请问', '你', '也', '是', '突尼斯人', '吗'],
    m: T('Excuse-moi, tu es tunisienne aussi ?', 'من فضلك، هل أنت تونسية أيضًا؟', 'Excuse me, are you Tunisian too?') },
  { id: 's_bushi', hz: '不,我不是突尼斯人。', py: 'Bù, wǒ bú shì Tūnísīrén.', tiles: ['不', '我', '不', '是', '突尼斯人'],
    m: T('Non, je ne suis pas tunisienne.', 'لا، لست تونسية.', 'No, I am not Tunisian.') },
  { id: 's_wofg', hz: '我是法国人。', py: 'Wǒ shì Fǎguórén.', tiles: ['我', '是', '法国', '人'],
    m: T('Je suis français(e).', 'أنا فرنسي / فرنسية.', 'I am French.') },
  { id: 's_wojiao', hz: '我叫萨米。', py: 'Wǒ jiào Sàmǐ.', tiles: ['我', '叫', '萨米'],
    m: T('Je m’appelle Sami.', 'اسمي سامي.', 'My name is Sami.') },
  { id: 's_nijiao', hz: '你叫什么名字?', py: 'Nǐ jiào shénme míngzi?', tiles: ['你', '叫', '什么', '名字'],
    m: T('Comment t’appelles-tu ?', 'ما اسمك؟', 'What is your name?') },
  { id: 's_woyeshi', hz: '我也是突尼斯人。', py: 'Wǒ yě shì Tūnísīrén.', tiles: ['我', '也', '是', '突尼斯人'],
    m: T('Moi aussi, je suis tunisien(ne).', 'أنا أيضًا تونسي / تونسية.', 'I am Tunisian too.') },
  { id: 's_woqingni', hz: '我请你。', py: 'Wǒ qǐng nǐ.', tiles: ['我', '请', '你'],
    m: T('Je t’invite.', 'أنا أدعوك.', 'I invite you (my treat).') },
  { id: 's_niwenta', hz: '你问她。', py: 'Nǐ wèn tā.', tiles: ['你', '问', '她'],
    m: T('Tu lui demandes (à elle).', 'أنت تسألها.', 'You ask her.') },
];

/* ---------- The dialogue of the lesson ---------- */
export const DIALOGUE = [
  { who: 'sami', s: 's_d1', hz: '小美,你是哪国人?', py: 'Xiǎoměi, nǐ shì nǎ guó rén?', m: T('Xiaomei, tu es de quelle nationalité ?', 'شياو ماي، من أيّ بلد أنت؟', 'Xiaomei, what nationality are you?') },
  { who: 'xiaomei', s: 's_d2', hz: '我是中国人。你呢?', py: 'Wǒ shì Zhōngguórén. Nǐ ne?', m: T('Je suis chinoise. Et toi ?', 'أنا صينية. وأنت؟', 'I am Chinese. And you?') },
  { who: 'sami', s: 's_wotn', hz: '我是突尼斯人。', py: 'Wǒ shì Tūnísīrén.', m: T('Je suis tunisien.', 'أنا تونسي.', 'I am Tunisian.') },
  { who: 'xiaomei', s: 's_tashei', hz: '她是谁?', py: 'Tā shì shéi?', m: T('Qui est-elle ?', 'من هي؟', 'Who is she?') },
  { who: 'sami', s: 's_tanvpy', hz: '她是我女朋友。', py: 'Tā shì wǒ nǚ péngyou.', m: T('C’est mon amie.', 'هي صديقتي.', 'She is my girlfriend.') },
  { who: 'xiaomei', s: 's_tajiao', hz: '她叫什么名字?', py: 'Tā jiào shénme míngzi?', m: T('Comment s’appelle-t-elle ?', 'ما اسمها؟', 'What is her name?') },
  { who: 'sami', s: 's_tamali', hz: '她叫玛丽。', py: 'Tā jiào Mǎlì.', m: T('Elle s’appelle Marie.', 'اسمها ماري.', 'Her name is Mary.') },
  { who: 'xiaomei', s: 's_d8', hz: '玛丽,请问,你也是突尼斯人吗?', py: 'Mǎlì, qǐng wèn, nǐ yě shì Tūnísīrén ma?', m: T('Marie, excuse-moi, tu es tunisienne aussi ?', 'ماري، من فضلك، هل أنت تونسية أيضًا؟', 'Mary, excuse me, are you Tunisian too?') },
  { who: 'mali', s: 's_d9', hz: '不,我不是突尼斯人。我是法国人。', py: 'Bù, wǒ bú shì Tūnísīrén. Wǒ shì Fǎguórén.', m: T('Non, je ne suis pas tunisienne. Je suis française.', 'لا، لست تونسية. أنا فرنسية.', 'No, I am not Tunisian. I am French.') },
];
export const SPEAKERS = {
  sami: { hz: '萨米', py: 'Sàmǐ', color: 'var(--jade)' },
  xiaomei: { hz: '小美', py: 'Xiǎoměi', color: 'var(--red)' },
  mali: { hz: '玛丽', py: 'Mǎlì', color: 'var(--gold)' },
};

/* ---------- Grammar notes (重点词语注脚) ---------- */
export const GRAMMAR = [
  { id: 'g_na', title: T('哪 nǎ ou 什么 shénme ?', '哪 nǎ أم 什么 shénme؟', '哪 nǎ or 什么 shénme?'),
    body: T(
      'Pour demander la nationalité, on utilise 哪 (quel) + 国 + 人. 什么 (quoi) sert pour les objets et les noms. On ne dit jamais « 你是什么国人 ».',
      'للسؤال عن الجنسية نستعمل 哪 (أيّ) + 国 + 人. أمّا 什么 (ماذا) فتُستعمل للأشياء والأسماء. لا نقول أبدًا «你是什么国人».',
      'To ask about nationality use 哪 (which) + 国 + 人. 什么 (what) is for things and names. Never say "你是什么国人".'),
    ok: ['你是哪国人?', '她叫什么名字?'], ko: ['你是什么国人?'] },
  { id: 'g_guo', title: T('Quand garder 国 ?', 'متى نحتفظ بـ 国؟', 'When do you keep 国?'),
    body: T(
      'Si le nom du pays a un seul caractère + 国 (中国, 法国, 美国), on garde 国 : 中国人. Si le nom a plusieurs syllabes (突尼斯, 日本, 印度), on ajoute seulement 人 : 突尼斯人.',
      'إذا كان اسم البلد حرفًا واحدًا + 国 (中国، 法国، 美国) نحتفظ بـ 国: 中国人. وإذا كان الاسم من عدّة مقاطع (突尼斯، 日本، 印度) نضيف 人 فقط: 突尼斯人.',
      'If the country is one character + 国 (中国, 法国, 美国), keep 国: 中国人. If the name has several syllables (突尼斯, 日本, 印度), just add 人: 突尼斯人.'),
    ok: ['中国人', '法国人', '突尼斯人', '日本人'], ko: ['中人', '法人', '突尼斯国人', '日本国人'] },
  { id: 'g_shei', title: T('谁 shéi : qui ?', '谁 shéi: مَن؟', '谁 shéi: who?'),
    body: T(
      '谁 sert à poser une question sur une personne. Il se place là où sera la réponse : 她是谁? → 她是我女朋友。',
      'تُستعمل 谁 للسؤال عن الأشخاص. توضع في مكان الجواب: 她是谁? ← 她是我女朋友。',
      '谁 asks about a person. It goes where the answer will be: 她是谁? → 她是我女朋友。'),
    ok: ['她是谁?', '她是我女朋友。'], ko: [] },
  { id: 'g_bu', title: T('不 bù : la négation', '不 bù: النفي', '不 bù: negation'),
    body: T(
      '不 se place devant le verbe : 我不是突尼斯人. Attention : devant un 4ᵉ ton, 不 se prononce au 2ᵉ ton → bú shì.',
      'توضع 不 قبل الفعل: 我不是突尼斯人. انتبه: قبل النغمة الرابعة تُنطق 不 بالنغمة الثانية ← bú shì.',
      '不 goes before the verb: 我不是突尼斯人. Careful: before a 4th tone, 不 is pronounced with the 2nd tone → bú shì.'),
    ok: ['我不是法国人。', '她不是中国人。'], ko: ['我是不法国人。'] },
  { id: 'g_ye', title: T('也 yě : aussi', '也 yě: أيضًا', '也 yě: also'),
    body: T(
      '也 se place toujours après le sujet et avant le verbe : 我也是突尼斯人. Jamais à la fin de la phrase comme en français.',
      'توضع 也 دائمًا بعد الفاعل وقبل الفعل: 我也是突尼斯人. ولا تأتي في آخر الجملة.',
      '也 always goes after the subject and before the verb: 我也是突尼斯人. Never at the end of the sentence.'),
    ok: ['我也是突尼斯人。', '你也是法国人吗?'], ko: ['我是突尼斯人也。'] },
  { id: 'g_ma', title: T('吗 ma et 呢 ne : poser une question', '吗 ma و 呢 ne: طرح سؤال', '吗 ma and 呢 ne: asking questions'),
    body: T(
      'Phrase + 吗 = question oui/non : 你是突尼斯人吗? — 呢 renvoie la même question : 我是中国人。你呢? (Et toi ?). Les deux se prononcent au ton neutre.',
      'جملة + 吗 = سؤال جوابه نعم/لا: 你是突尼斯人吗? — أمّا 呢 فتعيد السؤال نفسه: 我是中国人。你呢? (وأنت؟). تُنطقان بالنغمة المحايدة.',
      'Sentence + 吗 = yes/no question: 你是突尼斯人吗? — 呢 bounces the same question back: 我是中国人。你呢? (And you?). Both use the neutral tone.'),
    ok: ['你是突尼斯人吗?', '你呢?'], ko: [] },
  { id: 'g_qingwen', title: T('请问 qǐng wèn : la politesse', '请问 qǐng wèn: التهذيب', '请问 qǐng wèn: being polite'),
    body: T(
      '请 (inviter, prier) + 问 (demander) : formule polie avant de demander un renseignement, comme « excusez-moi… ».',
      '请 (يدعو، يرجو) + 问 (يسأل): عبارة مهذّبة قبل طلب معلومة، مثل «من فضلك…».',
      '请 (to invite, to beg) + 问 (to ask): a polite formula before asking something, like "excuse me…".'),
    ok: ['请问,你是哪国人?'], ko: [] },
];

/* ---------- Pinyin of the lesson (语音概要) ---------- */
export const INITIALS = [
  { s: 'b', ex: 'bu4', h: T('Non aspiré : comme le « p » français, sans souffle.', 'غير مهموس: مثل «p» الفرنسية دون نفخة هواء.', 'Unaspirated: like the "p" in "spy", no puff of air.') },
  { s: 'p', ex: 'peng2', h: T('Aspiré : « p » avec un souffle (p’h).', 'مهموس: «p» مع نفخة هواء (p’h).', 'Aspirated: "p" with a strong puff of air.') },
  { s: 'f', ex: 'fa3', h: T('Comme le « f » français.', 'مثل «ف» العربية.', 'Like English "f".') },
  { s: 't', ex: 'ta1', h: T('Aspiré : « t » avec un souffle (t’h).', 'مهموس: «ت» مع نفخة هواء.', 'Aspirated: "t" with a puff of air.') },
  { s: 'q', ex: 'qing3', h: T('« tch » avec un souffle, langue contre le palais.', '«تش» مع نفخة هواء، واللسان على الحنك.', '"ch" with a puff of air, tongue flat against the palate.') },
  { s: 'r', ex: 'ren2', h: T('Entre le « j » français et le « r » anglais.', 'بين «ج» الفرنسية (j) و«r» الإنجليزية.', 'Between French "j" and English "r".') },
  { s: 'y', ex: 'ye3', h: T('Comme le « y » de « yeux ».', 'مثل «ي» في «يد».', 'Like the "y" in "yes".') },
  { s: 'z', ex: 'zi4', h: T('Se prononce « dz ».', 'تُنطق «دز».', 'Pronounced "dz".') },
  { s: 'sh', ex: 'shi4', h: T('Comme « ch » en français, langue recourbée.', 'مثل «ش» مع ثني اللسان إلى الخلف.', 'Like English "sh", tongue curled back.') },
  { s: 'zh', ex: 'zhong1', h: T('Comme « dj » dans « Djerba », langue recourbée.', 'مثل «دج» في «جربة»، مع ثني اللسان.', 'Like "j" in "jungle", tongue curled back.') },
];
export const FINALS = [
  { s: '-i', ex: 'shi4', h: T('Voyelle sourde après z, c, s, zh, ch, sh, r : on prolonge la consonne.', 'صائت خافت بعد z, c, s, zh, ch, sh, r: نمدّ الحرف الساكن.', 'A "buzzed" vowel after z, c, s, zh, ch, sh, r: just prolong the consonant.') },
  { s: 'u', ex: 'bu4', h: T('Comme « ou » en français. Seul, il s’écrit wu.', 'مثل «و» الممدودة (ou). وحده يُكتب wu.', 'Like "oo" in "food". Alone it is written wu.') },
  { s: 'ü', ex: 'nv3', h: T('Comme le « u » français. Après j, q, x, y on écrit u sans tréma.', 'مثل «u» الفرنسية. بعد j, q, x, y تُكتب u بلا نقطتين.', 'Like French "u" / German "ü". After j, q, x, y it is written u.') },
  { s: 'ou', ex: 'you3', h: T('« o » qui se ferme en « ou ».', '«o» تنغلق إلى «ou».', 'Like "oh" gliding to "oo".') },
  { s: 'uo', ex: 'guo2', h: T('« ou » qui s’ouvre en « o ». Seul, il s’écrit wo.', '«ou» تنفتح إلى «o». وحده يُكتب wo.', '"oo" opening to "o". Alone it is written wo.') },
  { s: 'en', ex: 'ren2', h: T('Nasale où on prononce le « n », comme dans « Ben ».', 'أنفي يُنطق فيه «ن»، مثل «بن».', 'Nasal with a clear "n", like "un" in "under".') },
  { s: 'eng', ex: 'peng2', h: T('Nasale sans prononcer « n » ni « g », comme « lent ».', 'أنفي دون نطق «ن» أو «غ»، مثل «lent» الفرنسية.', 'Nasal, no "n" or "g" sound, like "ung" in "sung".') },
  { s: 'ong', ex: 'zhong1', h: T('Nasale comme dans « long » en français.', 'أنفي مثل «long» الفرنسية.', 'Nasal, like "oong".') },
];
// Syllables of the lesson with the tones that exist (听述三)
export const TONE_ROWS = [
  ['shi', '1234'], ['na', '1234'], ['guo', '1234'], ['ren', '234'], ['tu', '1234'], ['si', '134'],
  ['zhong', '134'], ['ta', '134'], ['shei', '2'], ['nv', '34'], ['peng', '1234'], ['you', '1234'],
  ['shen', '1234'], ['ming', '234'], ['zi', '134'], ['qing', '1234'], ['wen', '1234'], ['ye', '1234'],
  ['bu', '1234'], ['fa', '1234'], ['ma', '1234'],
];
export const TONES = [
  { n: 1, mark: 'ā', name: T('1ᵉʳ ton', 'النغمة الأولى', '1st tone'), d: T('Haut et plat, comme une note tenue.', 'عالية ومستوية، كنغمة موسيقية ممدودة.', 'High and flat, like holding a note.') },
  { n: 2, mark: 'á', name: T('2ᵉ ton', 'النغمة الثانية', '2nd tone'), d: T('Monte, comme une question : « Quoi ? ».', 'صاعدة، كأنّك تسأل: «ماذا؟».', 'Rising, like asking "What?".') },
  { n: 3, mark: 'ǎ', name: T('3ᵉ ton', 'النغمة الثالثة', '3rd tone'), d: T('Descend puis remonte, voix grave.', 'تنزل ثمّ تصعد، بصوت منخفض.', 'Dips down then rises, low voice.') },
  { n: 4, mark: 'à', name: T('4ᵉ ton', 'النغمة الرابعة', '4th tone'), d: T('Tombe sec, comme un ordre : « Non ! ».', 'تسقط بحدّة، كأمر: «لا!».', 'Falls sharply, like an order: "No!".') },
  { n: 0, mark: 'a', name: T('Ton neutre', 'النغمة المحايدة', 'Neutral tone'), d: T('Court et léger : ma, ne, me, zi…', 'قصيرة وخفيفة: ma، ne، me، zi…', 'Short and light: ma, ne, me, zi…') },
];
export const SANDHI = [
  { id: 'sd_bu', title: T('不 + 4ᵉ ton → bú', '不 + النغمة الرابعة ← bú', '不 + 4th tone → bú'),
    body: T('Devant un 4ᵉ ton, 不 (bù) passe au 2ᵉ ton.', 'قبل النغمة الرابعة تتحوّل 不 (bù) إلى النغمة الثانية.', 'Before a 4th tone, 不 (bù) switches to the 2nd tone.'),
    ex: [['不是', 'bù + shì → bú shì', 'bushi']] },
  { id: 'sd_half3', title: T('Le demi-3ᵉ ton', 'نصف النغمة الثالثة', 'The half third tone'),
    body: T('Devant un 1ᵉʳ, 2ᵉ ou 4ᵉ ton, le 3ᵉ ton reste grave et ne remonte pas.', 'قبل النغمة الأولى أو الثانية أو الرابعة تبقى النغمة الثالثة منخفضة ولا تصعد.', 'Before a 1st, 2nd or 4th tone, the 3rd tone stays low and does not rise.'),
    ex: [['女朋友', 'nǚ + péngyou', 'nvpengyou'], ['好人', 'hǎo + rén', 'haoren']] },
  { id: 'sd_neutral', title: T('Le ton neutre (轻声)', 'النغمة المحايدة (轻声)', 'The neutral tone (轻声)'),
    body: T('Certaines syllabes perdent leur ton : me dans shénme, zi dans míngzi, you dans péngyou, ma à la fin d’une question. Dans « A 是 B », 是 se lit aussi légèrement.', 'بعض المقاطع تفقد نغمتها: me في shénme، zi في míngzi، you في péngyou، و ma في آخر السؤال. وفي «A 是 B» تُنطق 是 خفيفة أيضًا.', 'Some syllables lose their tone: me in shénme, zi in míngzi, you in péngyou, ma at the end of a question. In "A 是 B", 是 is also read lightly.'),
    ex: [['什么', 'shénme', 'shenme'], ['名字', 'míngzi', 'mingzi'], ['朋友', 'péngyou', 'pengyou']] },
];

/* ---------- Learning path ---------- */
// kind: 'pinyin' opens the pinyin lab section, 'lesson' runs the lesson engine, 'dialogue' the role-play.
export const PATH = [
  { id: 'p_tones', kind: 'pinyin', sec: 'tones', icon: 'wave', title: T('Les 4 tons', 'النغمات الأربع', 'The 4 tones'),
    sub: T('Écoute, imite, vois ta voix', 'استمع، قلّد، وشاهد صوتك', 'Listen, imitate, see your voice') },
  { id: 'l1', kind: 'lesson', icon: 'user', title: T('Moi, toi, elle', 'أنا، أنت، هي', 'Me, you, her'),
    sub: T('我 你 她 是 人 好', '我 你 她 是 人 好', '我 你 她 是 人 好'),
    chars: ['人', '好', '她', '你', '我', '是'], words: ['wo', 'ni', 'ta', 'shi', 'ren', 'hao', 'haoren'], sents: [], notes: [] },
  { id: 'p_sounds', kind: 'pinyin', sec: 'sounds', icon: 'ear', title: T('Les sons de la leçon', 'أصوات الدرس', 'Sounds of the lesson'),
    sub: T('b p f t q r y z sh zh · u ü ou uo en eng ong', 'b p f t q r y z sh zh · u ü ou uo en eng ong', 'b p f t q r y z sh zh · u ü ou uo en eng ong') },
  { id: 'l2', kind: 'lesson', icon: 'globe', title: T('Les pays', 'البلدان', 'Countries'),
    sub: T('中国 法国 美国 突尼斯…', '中国 法国 美国 突尼斯…', '中国 法国 美国 突尼斯…'),
    chars: ['中', '国', '法', '美'], words: ['guo', 'zhongguo', 'faguo', 'meiguo', 'tunisi', 'zhongguoren', 'tunisiren', 'faguoren'], sents: ['s_wozg', 's_wotn', 's_wofg'], notes: ['g_guo'] },
  { id: 'l3', kind: 'lesson', icon: 'question', title: T('Tu es de quel pays ?', 'من أيّ بلد أنت؟', 'Where are you from?'),
    sub: T('你是哪国人? 你呢?', '你是哪国人? 你呢?', '你是哪国人? 你呢?'),
    chars: ['哪', '呢'], words: ['na', 'naguo', 'naguoren', 'ne', 'nine', 'riben', 'ribenren', 'yindu', 'yinduren'], sents: ['s_nishi', 's_nine', 's_wotn'], notes: ['g_na'] },
  { id: 'l4', kind: 'lesson', icon: 'heart', title: T('Qui est-ce ?', 'من هذه؟', 'Who is she?'),
    sub: T('她是谁? 女朋友', '她是谁? 女朋友', '她是谁? 女朋友'),
    chars: ['女', '友', '朋', '谁'], words: ['shei', 'nv', 'pengyou', 'nvpengyou', 'wonvpengyou'], sents: ['s_tashei', 's_tanvpy'], notes: ['g_shei'] },
  { id: 'l5', kind: 'lesson', icon: 'tag', title: T('Comment t’appelles-tu ?', 'ما اسمك؟', 'What is your name?'),
    sub: T('叫 什么 名字', '叫 什么 名字', '叫 什么 名字'),
    chars: ['么', '叫', '什', '名', '字'], words: ['jiao', 'shenme', 'mingzi', 'shenmemingzi', 'sami', 'mali', 'xiaomei'], sents: ['s_tajiao', 's_tamali', 's_nijiao', 's_wojiao'], notes: [] },
  { id: 'p_sandhi', kind: 'pinyin', sec: 'sandhi', icon: 'shuffle', title: T('Les tons qui changent', 'النغمات التي تتغيّر', 'Tones that change'),
    sub: T('bú shì · demi-3ᵉ ton · ton neutre', 'bú shì · نصف الثالثة · المحايدة', 'bú shì · half 3rd tone · neutral tone') },
  { id: 'l6', kind: 'lesson', icon: 'check', title: T('Oui ou non ?', 'نعم أم لا؟', 'Yes or no?'),
    sub: T('请问 不 也 吗', '请问 不 也 吗', '请问 不 也 吗'),
    chars: ['小', '不', '也', '问', '吗', '请'], words: ['qing', 'wen', 'qingwen', 'bu', 'bushi', 'ye', 'ma'], sents: ['s_niyema', 's_bushi', 's_woyeshi', 's_woqingni', 's_niwenta'], notes: ['g_bu', 'g_ye', 'g_ma', 'g_qingwen'] },
  { id: 'l7', kind: 'lesson', icon: 'plane', title: T('Encore des pays', 'بلدان أخرى', 'More countries'),
    sub: T('意大利 西班牙 德国 英国 澳大利亚', '意大利 西班牙 德国 英国 澳大利亚', '意大利 西班牙 德国 英国 澳大利亚'),
    chars: [], words: ['yidali', 'xibanya', 'deguo', 'yingguo', 'aodaliya', 'meiguoren'], sents: ['s_nishi', 's_wozg'], notes: [] },
  { id: 'dlg', kind: 'dialogue', icon: 'chat', title: T('Le dialogue complet', 'الحوار الكامل', 'The full dialogue'),
    sub: T('Écoute, répète, joue un rôle', 'استمع، كرّر، ومثّل دورًا', 'Listen, repeat, play a role') },
  { id: 'p_table', kind: 'pinyin', sec: 'table', icon: 'grid', title: T('Le tableau du pinyin', 'جدول البينيين', 'The pinyin chart'),
    sub: T('Toutes les syllabes du chinois, avec le son', 'كلّ مقاطع الصينية مع الصوت', 'Every Chinese syllable, with sound') },
];

/* ---------- Helpers ---------- */
export const WORD = Object.fromEntries(WORDS.map(w => [w.id, w]));
export const SENT = Object.fromEntries(SENTENCES.map(s => [s.id, s]));
export const CHAR = Object.fromEntries(CHARS.map(c => [c.c, c]));
export const NOTE = Object.fromEntries(GRAMMAR.map(g => [g.id, g]));
export const ALL_HANZI = [...new Set((CHARS.map(c => c.c).join('') + EXTRA_CHARS +
  WORDS.map(w => w.hz).join('') + '子十口日月大手门马尼玉').replace(/[^一-鿿]/g, ''))];

// Everything that needs a recorded audio clip: id -> Chinese text.
export function audioList() {
  const out = {};
  for (const c of CHARS) out['c_' + c.c.codePointAt(0).toString(16)] = c.c;
  for (const w of WORDS) out['w_' + w.id] = w.hz;
  for (const s of SENTENCES) out[s.id] = s.hz;
  for (const d of DIALOGUE) out[d.s] = d.hz;
  for (const g of GRAMMAR) g.ok.forEach((t, i) => { out[g.id + '_' + i] = t; });
  return out;
}
export const charAudio = c => 'c_' + c.codePointAt(0).toString(16);
