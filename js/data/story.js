// Rampart Riot — characters and in-battle story beats (bilingual). Cinematic cutscenes live in cinematics.js.
// The whole world, plot and cast are original to Rampart Riot.

export const CHARACTERS = {
  narrator: { ko: '', en: '', side: 'none' },
  warden: { ko: '수호관', en: 'The Warden', side: 'left', color: '#3d5a8a', bg: '#22324a' },
  brannoc: { ko: '브라녹', en: 'Brannoc', side: 'left', color: '#7a4a24', bg: '#3a2a1c' },
  seren: { ko: '세렌', en: 'Seren', side: 'left', color: '#5a3a9a', bg: '#2a2040' },
  kaela: { ko: '카엘라', en: 'Kaela', side: 'left', color: '#3f6a2a', bg: '#1f301a' },
  torvald: { ko: '토르발', en: 'Torvald', side: 'left', color: '#9a5a1a', bg: '#3a2410' },
  aerin: { ko: '에어린', en: 'Aerin', side: 'left', color: '#a8862a', bg: '#3a3018' },
  ysolde: { ko: '이졸데', en: 'Ysolde', side: 'left', color: '#a83a1a', bg: '#3a1a10' },
  scout: { ko: '척후병', en: 'Scout', side: 'left', color: '#5a5a3a', bg: '#2a2a1a' },
  villager: { ko: '마을 사람', en: 'Villager', side: 'left', color: '#6a5a3a', bg: '#2a2418' },
  mercenary: { ko: '사로잡힌 용병', en: 'Captured Sellsword', side: 'right', color: '#4a2a4a', bg: '#221422' },
  varkas: { ko: '바르카스 모로우', en: 'Varkas Morrow', side: 'right', color: '#5a1a3a', bg: '#24101c' },
  gorrath: { ko: '고라스', en: 'Gorrath', side: 'right', color: '#5a4a3a', bg: '#241c14' },
  maelis: { ko: '마엘리스 여왕', en: 'Queen Maelis', side: 'right', color: '#6a8aaa', bg: '#1c2a3a' },
  heart: { ko: '재의 심장', en: 'The Cinder Heart', side: 'right', color: '#a83a0a', bg: '#2a0a04' },
};

const N = (ko, en) => ({ who: 'narrator', ko, en });
const B = (ko, en) => ({ who: 'brannoc', ko, en });
const S = (ko, en) => ({ who: 'seren', ko, en });
const W = (ko, en) => ({ who: 'warden', ko, en });
const K = (ko, en) => ({ who: 'kaela', ko, en });
const T = (ko, en) => ({ who: 'torvald', ko, en });
const A = (ko, en) => ({ who: 'aerin', ko, en });
const Y = (ko, en) => ({ who: 'ysolde', ko, en });
const V = (ko, en) => ({ who: 'varkas', ko, en });
const X = (who, ko, en) => ({ who, ko, en });

export const STORY = {
  // ===================== CHAPTER I — GREENMARCH =====================
  s1_1_pre: [
    N('봉화는 밤새 성벽을 따라 타올랐다. 새벽이 오기 전, 첫 그림링 무리가 녹음의 변경을 넘었다.', 'The beacons burned along the Rampart all night. Before dawn, the first grimlings crossed into the Greenmarch.'),
    B('당신이 새 수호관이군. 수도에서 지원을 보낸다길래 군대를 기대했는데.', "So you're the new Warden. The capital promised help. I was hoping for an army."),
    B('뭐, 상관없소. 그림링은 작고 멍청하지만 떼로 몰려오지. 길을 따라 탑을 세우고, 한 놈도 마을에 들이지 마시오.', "No matter. Grimlings are small and stupid, but they come in swarms. Raise towers along the road and let none of them reach the village."),
    W('그럼 기다리게 할 이유가 없군.', "Then let's not keep them waiting."),
  ],
  s1_1_post: [
    B('첫날 치고는 나쁘지 않군.', 'Not bad for a first day.'),
    B('그런데 이상하오. 놈들은 약탈하러 온 게 아니었소. 무언가에게서 도망치고 있었지.', "Something's off, though. They weren't raiding. They were running from something."),
  ],
  s1_2_pre: [
    X('villager', '나루를 건너야 해요! 개들이… 불붙은 개들이 들판을 달려와요!', "We have to cross the ford! Hounds— burning hounds, running over the fields!"),
    B('잿불 사냥개로군. 빠르지만 약하오. 길목에 병영을 두고 발을 묶으시오.', "Cinder hounds. Fast, but fragile. Put barracks on the road and pin their legs."),
  ],
  s1_3_pre: [
    K('당신이 수호관? 궁수들이 그림자에 대고 화살을 낭비하고 있던데.', "You're the Warden? Your archers are wasting arrows on shadows."),
    K('이 숲은 내가 알아요. 진짜 적이 어디서 오는지 보여 주죠.', "I know this forest. Let me show you where the real ones come from."),
    B('카엘라. 변경의 순찰자요. 말은 짧지만 화살은 길지.', "Kaela. A Greenmarch ranger. Short on words, long on arrows."),
  ],
  s1_3_post: [
    K('숲 너머에서 연기가 올라요. 애시비 마을이에요.', "Smoke beyond the trees. That's Ashby."),
    K('…같이 가죠. 당신 곁에 서는 편이 화살을 아끼는 길 같으니까.', "...I'll come with you. Standing beside you seems to save arrows."),
  ],
  s1_4_pre: [
    B('어릴 적엔 성벽에 동전을 던지며 소원을 빌었소. 저 너머에 뭔가 있다고 믿는 사람은 아무도 없었지.', "As a boy, I tossed coins at the Rampart for luck. Nobody believed anything lived on the other side."),
    B('삼백 년 동안 아무 일도 없으면, 사람들은 벽이 왜 서 있는지 잊는 법이오.', "Three hundred quiet years, and people forget why a wall was built."),
  ],
  s1_5_pre: [
    S('이 돌들… 기억하고 있어요. 들리지 않나요?', "These stones... they remember. Can't you hear them?"),
    B('내 귀엔 그림링 소리밖에 안 들리는데.', "All I hear is grimlings."),
    S('대마법사님이 저를 보냈어요. 성벽의 균열이 무작위가 아니래요. 누군가 일부러 낸 거예요.', "The Archmage sent me. The cracks in the Rampart aren't random. Someone made them."),
  ],
  s1_6_pre: [
    S('여기가 성벽의 돌을 캐던 곳이에요. 벽에 글씨가 새겨져 있어요.', "This is where the Rampart's stones were cut. There's writing on the rock."),
    S('"나의 피를 이은 자가 망루를 지키는 한, 이 벽은 무너지지 않으리라."', '"While one of my blood keeps the watch, this wall shall not fall."'),
    S('망루를 지키는 자… 누구의 피를 말하는 걸까요?', "Keeps the watch... whose blood does it mean?"),
    B('…일이나 합시다. 놈들이 오고 있소.', "...Let's work. They're coming."),
  ],
  s1_6_post: [
    S('브라녹, 아까 왜 대답을 피했어요?', "Brannoc, why did you dodge my question?"),
    B('늙은 병사는 모르는 게 많소. 그걸 들키기 싫을 뿐이지.', "An old soldier doesn't know much. He just hates being caught at it."),
  ],
  s1_7_pre: [
    X('scout', '수호관님! 동쪽 관문이 완전히 무너졌습니다! "파괴자"가 맨손으로 성문을 찢었답니다!', "Warden! The eastern gate is gone! They say the Breaker tore it open with his bare hands!"),
    B('봉화를 다시 올려야 하오. 동쪽 요새들이 우리 신호를 봐야 하니.', "We need to relight the beacon. The eastern forts must see our signal."),
  ],
  s1_8_pre: [
    B('저건 그림링이 아니오. 다리 달린 공성 무기지.', "That's no grimling. That's a siege engine with legs."),
    S('저 손에 쥔 것… 빛나고 있어요. 검은 유리 조각 같아요.', "What's in his hand... it's glowing. Like a shard of black glass."),
  ],
  s1_8_boss: [
    X('gorrath', '벽… 부순다. 전부… 부순다!', 'Wall... break. Break... all!'),
  ],

  // ===================== CHAPTER II — FROSTBOUND PASS =====================
  s2_1_pre: [
    B('추위가 뼈를 갉아먹는군. 이 나이에 설산 원정이라니.', "This cold gnaws at the bones. A mountain campaign, at my age."),
    S('모로우 가문의 영지는 이 고개 너머예요. 반지의 주인을 찾으려면 지나가야 해요.', "House Morrow's lands lie past this pass. If we want the ring's owner, we go through."),
  ],
  s2_2_pre: [
    K('늑대들이 사람을 피하지 않아요. 무언가에 쫓기고 있거나… 무언가에 홀렸거나.', "The wolves don't fear us. Something's driving them... or something's calling them."),
  ],
  s2_3_pre: [
    T('늦었소, 지상 양반들! 철맥 요새는 사흘째 버티는 중이오!', "You're late, surface-folk! Ironvein Hold has held for three days!"),
    T('대포는 내 거니까 함부로 만지지 마시오. 대신 맘껏 쏴도 좋소!', "Those cannons are mine, so hands off. But by all means— fire away!"),
  ],
  s2_3_post: [
    T('토르발 엠버포지요. 철맥의 기술장. 당신들 덕에 내 대포들이 무사하니, 빚을 갚아야지.', "Torvald Emberforge, chief engineer of Ironvein. You saved my cannons. I pay my debts."),
  ],
  s2_4_pre: [
    X('mercenary', '난 그냥 돈 받고 왔소! 모로우 경이… 검은 유리로 값을 치렀소. 땅도 준다고 했고.', "I only came for pay! Lord Morrow paid us in black glass... promised us land, too."),
    X('mercenary', '성벽이 무너지면 왕국엔 새 왕이 필요할 거라더군. 불을 두려워하지 않는 왕이.', "Said when the wall falls, the realm will need a new king. One who doesn't fear fire."),
  ],
  s2_5_pre: [
    S('이 조각들이 속삭여요. 귀를 막아도 들려요.', "The shards whisper. Even when I cover my ears."),
    B('그럼 듣지 마시오. 그건 명령이오.', "Then don't listen. That's an order."),
  ],
  s2_6_pre: [
    S('예배당 벽화예요. 마엘리스 여왕… 그리고 품에 안긴 아이.', "A mural. Queen Maelis... and a child in her arms."),
    S('여왕의 문장이 제 어머니의 낡은 브로치와 똑같아요.', "Her crest is the same as my mother's old brooch."),
    B('어떤 이야기는 얼어 있는 편이 낫소.', "Some stories are better left frozen."),
  ],
  s2_7_pre: [
    T('산이 무너진다면 놈들 머리 위로 먼저 무너지게 해 주지!', "If the mountain falls, it'll fall on them first!"),
  ],
  s2_8_pre: [
    T('흐림발드… 할아버지 때부터 저 비룡은 잠들어 있었소. 누가 깨운 거요?', "Hrimvald... that wyrm has slept since my grandfather's day. Who woke it?"),
    S('머리에 박힌 저 빛… 검은 조각이에요. 조각이 저것을 조종하고 있어요.', "That light in its skull... a shard. The shard is driving it."),
  ],

  // ===================== CHAPTER III — THE DROWNED CROWN =====================
  s3_1_pre: [
    S('십칠 년이에요, 브라녹. 십칠 년 동안 한 번도 말해 주지 않았어요.', "Seventeen years, Brannoc. Seventeen years, and you never told me."),
    B('십칠 년 동안, 당신은 살아 있었소.', "Seventeen years, and you're alive."),
  ],
  s3_2_pre: [
    A('수호관님! 수도에서 왔습니다. 국왕 폐하께서 승하하셨습니다.', "Warden! I fly from the capital. The King is dead."),
    A('귀족들은 왕좌를 두고 다투고, 거리마다 폭동입니다. 그런데 모로우 경은 군대를 이끌고 이 늪으로 왔어요.', "The nobles fight over the throne, and every street is rioting. Yet Lord Morrow marched his army here, into the marsh."),
    A('가라앉은 옛 왕도 어딘가에… "잿불 왕관"이 있다는 소문입니다.', "Somewhere in the sunken old capital, they say, lies the Ember Crown."),
  ],
  s3_2_post: [
    A('폐하께서 남기신 마지막 명령은 수호관을 도우라는 것이었습니다. 이제부터 제 그리핀이 당신의 날개가 되겠습니다.', "The King's last command was to aid the Warden. From now on, my griffin will be your wings."),
    B('날개라… 높은 데서 보면 이 늪도 좀 나아 보이오?', 'Wings, eh? Does this swamp look any better from up there?'),
    A('아뇨. 하지만 적이 어디서 오는지는 똑똑히 보이죠.', 'No. But I can see exactly where the enemy is coming from.'),
  ],
  s3_3_pre: [
    B('당신 어머니는 왕의 누이였소. 그리고 나는 그분의 호위였지.', "Your mother was the King's sister. I was her guard."),
    B('마엘리스의 피를 이은 자는 평생 성벽에 묶여 살아야 했소. 그분은 당신만은 자유롭기를 바랐소.', "Every child of Maelis lived chained to that wall. She wanted you, at least, to be free."),
    S('…그래서 저를 숨겼군요.', "...So you hid me."),
    B('그래서 지켰소.', "So I kept you safe."),
  ],
  s3_4_pre: [
    V('수호관. 늦었군. 왕관은 이미 내 손에 있다.', "Warden. You're late. The Crown is already mine."),
    V('늙은 여왕은 벽을 쌓고 그걸 평화라 불렀지. 나는 그것을 우리라 부른다.', "The old queen built a wall and called it peace. I call it a cage."),
  ],
  s3_5_pre: [
    S('성벽이 제 피에 답한다면… 제가 답하게 만들겠어요.', "If the wall answers to my blood... then I'll make it answer."),
  ],
  s3_6_pre: [
    B('세렌. 화난 거 알고 있소. 그래도 오늘은 내 뒤에 서 주시오.', "Seren. I know you're angry. But today, stand behind me."),
    S('오늘은 옆에 설게요. 그게 제 대답이에요.', "Today I'll stand beside you. That's my answer."),
  ],
  s3_7_pre: [
    K('다리 저편이 새카매요. 이 정도 수는… 막을 수 없어요.', "The far side of the bridge is black with them. Numbers like that... we can't hold."),
    B('막을 필요는 없소. 건너갈 시간만 벌면 되지.', "We don't need to hold. Just buy time to cross."),
  ],
  s3_8_pre: [
    V('봐라, 수호관! 죽은 자들조차 새 왕에게 무릎을 꿇는다!', "Behold, Warden! Even the dead kneel to their new king!"),
    S('그건 무릎 꿇은 게 아니에요. 묶인 거예요. 당신처럼.', "They're not kneeling. They're bound. Just like you."),
  ],
  s3_8_boss: [
    V('왕관이 나를 선택했다! 이 불꽃이 나를 왕으로 만들 것이다!', "The Crown chose me! This fire will make me king!"),
  ],

  // ===================== CHAPTER IV — HEART OF ASH =====================
  s4_1_pre: [
    N('삼백 년 만에, 왕국의 군대가 성벽 너머로 발을 디뎠다.', 'For the first time in three hundred years, the realm\'s army stepped beyond the wall.'),
    S('성벽이 따뜻해요. 마치 우리를 배웅하는 것처럼.', "The wall is warm. As if it's seeing us off."),
  ],
  s4_2_pre: [
    Y('성벽의 사람들이군. 여기까지 온 건 당신들이 처음이야.', "People of the wall. You're the first to come this far."),
    Y('당신들의 여왕은 심장을 돌 뒤에 가뒀지. 그리고 우리도 함께 가뒀어.', "Your queen sealed the Heart behind stone. And sealed us in with it."),
  ],
  s4_2_post: [
    Y('이졸데. 재의 땅에서 태어난 자. 분화구까지 길을 안내하지.', "Ysolde. Born of the ash. I'll guide you to the crater."),
    Y('용서 때문이 아니야. 이 땅에 처음으로 아침이 오는 걸 보고 싶어서지.', "Not out of forgiveness. I want to see morning come to this land, once."),
  ],
  s4_3_pre: [
    T('흑요석이 사방에 깔렸군. 대장장이의 낙원이자 지옥이오.', "Obsidian everywhere. A smith's paradise— and his nightmare."),
  ],
  s4_4_pre: [
    Y('심장은 원래 별이었어. 하늘에서 떨어져 갇힌 별.', "The Heart was a star once. It fell, and it was trapped."),
    Y('닿는 모든 걸 태우면서 하늘을 기억하지. 돌아가려고 세상을 땔감 삼아 기어오를 거야.', "It burns all it touches, and it remembers the sky. It will burn the world to climb back."),
  ],
  s4_5_pre: [
    A('하늘에서 보니 불의 강이 분화구로 흘러들어요. 마치 심장으로 피가 모이는 것처럼.', "From the sky, the rivers of fire all flow to the crater. Like blood to a heart."),
  ],
  s4_6_pre: [
    S('목소리가 들려요. 조각들이 부르던 것과는 달라요. 아주… 슬픈 목소리예요.', "I hear a voice. Not like the shards. It's... so sad."),
  ],
  s4_7_pre: [
    X('maelis', '나의 아이야. 나는 내 피를 돌에 묶었다. 그 벽은 삼백 년을 버텼지.', "My child. I bound my blood to stone. The wall held for three hundred years."),
    X('maelis', '그 대가로 내 핏줄의 모든 아이가 자유를 잃었다. 내 맹세를 잇지 말거라. 끝내거라.', "It cost every child of my line their freedom. Do not renew my oath. End it."),
  ],
  s4_8_pre: [
    S('수호관. 제가 심장에 닿을 때까지만 버텨 주세요.', "Warden. Hold them— just until I reach the Heart."),
    W('네가 닿을 때까지, 아무도 지나가지 못한다.', "Until you reach it, nothing passes."),
  ],
  s4_8_boss: [
    X('heart', '작은 여왕이여. 너의 벽은 이미 먼지다.', "Little queen. Your wall is already dust."),
  ],
  s4_8_p2: [
    X('heart', '나는 하늘이었다. 나는 다시 하늘이 될 것이다.', "I was the sky. I will be the sky again."),
  ],
  s4_8_p3: [
    S('그래요. 하늘로 돌려보내 줄게요. 하지만 혼자 가게 두진 않아요.', "Yes. I'll give you back the sky. But you won't go alone."),
  ],
};
