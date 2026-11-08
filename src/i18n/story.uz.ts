// Hikoya, voqealar, maslahatchilar va yakunlar matni - o'zbekcha (lotin yozuvi).
export const STORY_UZ: Record<string, string> = {
  // ---------------------------------------------------------------- nom va makon
  "story.title": "So'nggi qirg'oq",
  "story.tagline": "O'n yil. Bitta shaharcha. Chekinayotgan dengiz.",
  "story.teaser":
    "Ko'k dengiz har fasl Oqtoshdan sal nariroq ketadi — qayiqlarni yonboshlatib, shamolga tuz qo'shib. Shaharchaning yangi oqsoqoli sifatida nimani saqlab qolishni hal qilishga o'n yilingiz bor: tumanni rozi qiladigan paxtanimi, elni boqadigan dalalarnimi yoki suvning o'zinimi. Qamish va saksovul eking, kanal qazing, Katta to'g'onga tavakkal qiling — yoki shaharchaning dengiz ortidan ketib borishini kuzatib turing.",
  "story.setting":
    "Oqtosh — ikki daryo to'yintirib turgan Ko'k dengiz sohilidagi baliqchilar shaharchasi. Yuqori oqimda bu daryolarni paxta dalalariga burishyapti, dengiz esa kun sayin kichrayib bormoqda.",

  // ---------------------------------------------------------------- maslahatchilar
  "adv.ermek": "Ermek-ota",
  "adv.ermek.role": "keksa baliqchi",
  "adv.dilnoza": "Dilnoza",
  "adv.dilnoza.role": "gidromuhandis",
  "adv.tolib": "Rais Tolib",
  "adv.tolib.role": "tuman amaldori",
  "adv.saida": "Saida opa",
  "adv.saida.role": "shifokor",
  "adv.timur": "Timur",
  "adv.timur.role": "yoshlar ovozi",
  "adv.elder": "Oqsoqol",
  "adv.elder.role": "siz",

  // ---------------------------------------------------------------- asosiy voqealar
  "ev.intro.title": "Oqtoshning yangi oqsoqoli",
  "ev.intro.body":
    "Kengash sizni oqsoqol etib sayladi, butun Oqtosh eski bandargohga yig'ilib, yangi oqsoqolga umid bilan qarab turibdi. Ermek-ota hassasi bilan kulrang suvni ko'rsatadi: «Ko'k dengiz har bahor bir qadam nari ketadi, bolam. O'zi to'xtamaydi.» Poytaxtdan kanal chizmalari bilan qaytgan Dilnoza esa o'n yil yetadi, deydi — faqat bugundan boshlash kerak.",
  "ev.intro.go": "Ishga kirishamiz",

  "ev.quota_first.title": "Paxta rejasi",
  "ev.quota_first.body":
    "Rais Tolib tuman mashinasida chang-to'zon ichida yetib keladi va qizil muhrli qog'ozni yoyadi. Oqtosh har kuzda tumanga {q} toy paxta topshirishi shart — hozir omboringizda {have} toy bor. Topshirsangiz, tuman haqini to'laydi; yetmasa, qolganini qo'shnilardan sotib olsa bo'ladi. «Rejani uch marta bajarmasangiz, — deydi u xushmuomalalik bilan, — tuman yangi oqsoqol topadi.»",
  "ev.quota_first.deliver": "Paxtani topshiramiz",
  "ev.quota_first.bargain": "Savdolashib ko'ramiz",
  "ev.quota_first.refuse": "Rejani rad etamiz",

  "ev.quota.title": "Kuz: reja vaqti keldi",
  "ev.quota.body":
    "Rais Tolib yana o'sha qizil muhr bilan keldi. Bu yil tuman {q} toy paxta talab qilyapti, omboringizda esa {have} toy bor. Daftarda shu paytgacha {fails} marta bajarilmagan reja qayd etilgan — uchinchisi oxirgisi bo'ladi.",
  "ev.quota.deliver": "Paxtani topshiramiz",
  "ev.quota.bargain": "Muhlat so'rab savdolashamiz",
  "ev.quota.refuse": "Rejani rad etamiz",
  "ev.quota.deliver.done":
    "Paxta topshirildi, qog'ozlarga muhr bosildi. Tuman {pay} so'm to'ladi, ortib qolgan toylar esa bozorda {extra} so'mga sotildi.",
  "ev.quota.bargain.win":
    "Tolib xo'rsinib, kutishga rozi bo'ldi — lekin bu yilgi rejaning chorak qismi kelasi kuzga qo'shiladi. Ortiqcha paxta {extra} so'mga sotildi. Daftarda bajarilmagan reja: {fails} / 3.",
  "ev.quota.bargain.warn": "Rais Tolib savdolashishga ko'nmadi, lekin bu safar shov-shuv ko'tarmadi: rejaning yarmini — {add} toyni — kelasi yilga qo'shib yozib qo'ydi. «Ikkinchi marta bunaqasi o'tmaydi», — dedi u. Qolgan paxta bozorda {extra} so'mga sotildi.",
  "ev.quota.bargain.lose":
    "Savdolashuv chiqmadi: Tolib buni bajarilmagan reja deb yozib qo'ydi — {fails} / 3. Bor paxta bozorda {extra} so'mga sotildi.",
  "ev.quota.refuse.done":
    "Tolibni quruq qo'l bilan qaytardingiz, paxtani esa bozorda {extra} so'mga sotdingiz. Tuman endi yuqorida daryodan yana biroz ko'proq suv oladi. Daftarda bajarilmagan reja: {fails} / 3.",

  "ev.harbour.title": "Eski bandargoh quriyapti",
  "ev.harbour.body":
    "Suv eski iskalalardan uzoqlashib ketyapti, birinchi qayiqlar allaqachon tuz ustida yonboshlab yotibdi. Ermek-ota bir paytlar to'lqin urilib turgan joyda turib gapiradi: «Qayiqlarni {cost} so'mga dengiz ortidan sudrab borsa bo'ladi. Yo bo'lmasa, tinch qo'yaylik — bir kun odamlar dengiz qanaqa bo'lganini ko'rgani kelishadi.»",
  "ev.harbour.museum": "Qolsin — xotira bo'lib tursin",
  "ev.harbour.move": "Qayiqlarni suvga ko'chiramiz",
  "ev.harbour.scrap": "Qayiqlarni buzib, taxtasini sotamiz",
  "ev.harbour.move.done":
    "Arqon, g'altak va shaharchaning yarmi bilan qayiqlar yangi qirg'oqqa sudrab borildi — saqlab qolingan qayiqlar: {moved} ta. Ermek-ota sal ko'zi namlandi-yu, shamolni aybladi.",

  "ev.storm_warning.title": "Bo'ron yaqinlashmoqda",
  "ev.storm_warning.body":
    "Dilnoza qish bo'yi shamollarni kuzatdi, hisob-kitoblari esa unga yoqmayapti. «Bahorda butun qurigan dengiz tubi osmonga ko'tariladi — bunaqa tuz bo'ronini bu yerda hali hech kim ko'rmagan.» Hozir ekilgan saksovul zarbaning eng yomonini to'sadi, qolganiga esa odamlar tayyorlanishi kerak.",
  "ev.storm_warning.masks": "Har oilaga niqob tikamiz",
  "ev.storm_warning.wells": "Quduqlarni yopamiz",
  "ev.storm_warning.nothing": "Bo'ronni ko'p ko'rganmiz",

  "ev.storm_after.title": "Tuz bo'ronidan keyin",
  "ev.storm_after.body":
    "Uch kun osmon oppoq bo'lib turdi. Saida opa og'zini ro'mol bilan to'sib, ko'chama-ko'cha yuribdi: har bir tomda tuz qatlami. «Uylarga {dust} o'lchov chang o'tirdi, yerning sho'rligi {sal} ga yetdi. Hozir tozalaymiz — yoki yil bo'yi shu tuzdan nafas olamiz.»",
  "ev.storm_after.clean": "Ko'cha va tomlarni tozalaymiz",
  "ev.storm_after.wash": "Daryo suvi bilan yuvamiz",
  "ev.storm_after.endure": "Shamol o'zi uchirib ketar",

  "ev.epidemic.title": "Saida opaning ogohlantirishi",
  "ev.epidemic.body":
    "Saida opa ilk bemorlarni ko'rdi: isitma, tirishish, oyoqda turolmaydigan bolalar. «Hammasi suvdan — sho'r quduqlar va tuz changidan. Menga hozir shifoxona va toza suv bering, aks holda kuzgacha qabr sanaymiz.» Oqtoshda hozir shifoxonalar soni: {clinics}.",
  "ev.epidemic.clinic": "Shifoxonaga mablag' ajratamiz",
  "ev.epidemic.water": "Shoshilinch toza suv keltiramiz",
  "ev.epidemic.ignore": "O'zi o'tib ketar",
  "ev.epidemic.hit": "Isitma baribir keldi. {dead} kishi undan omon chiqmadi, butun shaharcha ularni so'nggi yo'lga kuzatdi.",
  "ev.epidemic.spared": "Isitma bir-ikki xonadonga kirib chiqdi-yu, o'tib ketdi. Saida opa nihoyat bir kecha tinch uxladi.",

  "ev.dike_plan.title": "Katta to'g'on",
  "ev.dike_plan.body":
    "Dilnoza kengash stoliga uzun chizmani yoyadi. «Shimoliy qo'ltiq sayoz. Uning og'zini {tiles} katakli to'g'on bilan bekitsak, unga beradigan har tomchi suvni ushlab qolamiz — ochiq dengiz esa ketaversin.» To'rt fasl og'ir mehnat, har fasl pul va bor bo'sh qo'l kerak bo'ladi. «Kichkina dengiz umuman yo'qidan yaxshi», deydi u.",
  "ev.dike_plan.approve": "Loyihani tasdiqlaymiz",
  "ev.dike_plan.later": "Hozircha emas",

  "ev.aid.title": "Chet ellik mehmonlar",
  "ev.aid.body":
    "Oq jip, tarjimon va qo'lida daftar ushlagan uchta kulib turgan mehmon. Xorijiy missiya katta grant taklif qilyapti — evaziga Oqtoshni «o'rganmoqchi»: kasal bolalarni suratga olish, suhbatlar, qon namunalari. Rais Tolib bunga juda xursand. Butun el sizning javobingizni kutib turibdi.",
  "ev.aid.accept": "Pulni olamiz",
  "ev.aid.refuse": "Biz ko'rgazma emasmiz",

  // ---------------------------------------------------------------- tasodifiy voqealar
  "ev.locusts.title": "Chigirtka",
  "ev.locusts.body":
    "Kechqurun qaqragan cho'ldan qo'ng'ir bulut bostirib keldi, tongda esa bug'doyzor chigirtkadan shitirlab yotardi. Ermek-ota umrida buni ikki marta ko'rgan. «Zahar sepamizmi, tutun qilamizmi yo duo — kuzgi hosilgacha bir qarorga keling.»",
  "ev.locusts.spray": "Dalaga zahar sepamiz",
  "ev.locusts.smoke": "Dala atrofida tutun qilamiz",
  "ev.locusts.pray": "Duo qilib kutamiz",

  "ev.caravan.title": "Janubdan karvon",
  "ev.caravan.body":
    "Timur hansirab yugurib keldi: shaharcha chetida yuk mashinalari va tuyalar turibdi, savdogarlar un sotib, to'qilgan har narsani sotib olishyapti. Narxlari unchalik insofli emas, lekin qoplari to'la.",
  "ev.caravan.buy": "Un sotib olamiz",
  "ev.caravan.sell": "Qamish bo'yralarni sotamiz",
  "ev.caravan.pass": "Yo'llarida davom etishsin",

  "ev.wedding.title": "Oqtoshda to'y",
  "ev.wedding.body":
    "Timurning amakivachchasi uylanyapti, shaharchaning yarmi allaqachon osh haqida bahslashyapti. Haqiqiy to'y hammaning ko'nglini ko'taradi — omborning ancha qismini ham bo'shatadi.",
  "ev.wedding.feast": "Kattakon to'y qilamiz",
  "ev.wedding.modest": "Kamtarona nishonlaymiz",
  "ev.wedding.postpone": "Bir fasl kutib turishsin",

  "ev.fish_dieoff.title": "Suv ustida kumush",
  "ev.fish_dieoff.body":
    "Bugun ertalab to'rlar o'lik baliqqa to'lib chiqdi — qorni oqarib, tuzga belangan. Ermek-ota qirg'oq yonidagi suv juda achchiq bo'lib ketganini aytadi. «Qayiqlarni uzoqqa, baliq hali tirik joyga yuboraylik — yoqilg'iga pul ketadi. Yo bo'lmasa, o'tib ketguncha kamroq yeymiz.»",
  "ev.fish_dieoff.far": "Qayiqlarni uzoqqa yuboramiz",
  "ev.fish_dieoff.accept": "Yaqinda ovlaymiz, kam bo'lsa ham",

  "ev.sandstorm.title": "Quruq shamol",
  "ev.sandstorm.body":
    "Ochilib qolgan dengiz tubidan issiq shamol esyapti, u dengizning tuzini ham uchirib kelyapti. Saida opa keksalar va go'daklar yo'talib qolmasdan har bir derazaning tavaqasini yopib, ho'l mato tutishni so'raydi.",
  "ev.sandstorm.shutters": "Uylarni berkitamiz",
  "ev.sandstorm.endure": "Kutib turamiz",

  "ev.school.title": "Maktab tomi",
  "ev.school.body":
    "Timur Oqtoshdagi barcha o'quvchilar imzolagan ariza olib keldi: maktab tomi chakka o'tkazyapti, oxirgi o'qituvchi ham katta shaharga ketaman deyapti. «Bu yerda maktab bo'lmasa, kelajak ham bo'lmaydi», deydi u jiddiy qilib.",
  "ev.school.fund": "Tomni tuzatib, ustozga haq to'laymiz",
  "ev.school.refuse": "Bunga pul yo'q",

  "ev.youth_leave.title": "Yoshlar ketmoqchi",
  "ev.youth_leave.body":
    "O'n chog'li yigit-qiz katta shaharga ketish uchun yukini bog'lab qo'ydi, Timur ham ularning orasida, hammadan baland gapiradi. «Bu yerda tuz bilan kutishdan boshqa ish yo'q.» Ular oq fotiha bilan ketib, uyga pul jo'natishi mumkin — yoki ularni olib qolish uchun bir sabab topishingiz kerak.",
  "ev.youth_leave.bless": "Oq fotiha berib jo'natamiz",
  "ev.youth_leave.persuade": "Ish o'rni ochib, olib qolamiz",
  "ev.youth_leave.forbid": "Ketishni taqiqlaymiz",

  "ev.salty_well.title": "Quduq sho'rladi",
  "ev.salty_well.body":
    "Shaharcha qudug'ining suvi endi sho'r tatiydi, Saida opaning bemorlari buni undan ham oldin sezishdi. Chuqurroq quduq toza suvga yetadi; saksovul o'tinida qaynatish ozgina yordam beradi; hech narsa qilmasak, buning bahosini sog'ligimiz bilan to'laymiz.",
  "ev.salty_well.dig": "Chuqurroq quduq qazaymiz",
  "ev.salty_well.boil": "Suvni qaynatib ichamiz",
  "ev.salty_well.ignore": "Ko'nikib ketamiz",

  "ev.cotton_boom.title": "Paxta uchun bo'nak",
  "ev.cotton_boom.body":
    "Rais Tolibning kayfiyati g'ayrioddiy yaxshi: paxta narxi oshgan, tuman hoziroq bo'nak to'lashga tayyor — agar Oqtosh kelasi kuz ko'proq topshirishga va'da bersa. Bugun pul, ertaga og'irroq reja.",
  "ev.cotton_boom.accept": "Bo'nakni olamiz",
  "ev.cotton_boom.decline": "Reja o'zgarmasin",

  "ev.salvage.title": "Temir-tersakchilar",
  "ev.salvage.body":
    "Payvand apparati va yuk mashinasi bilan kelgan ikki kishi dengiz tubidagi o'lik qayiqlarni so'rayapti — {n} tasiga pul to'lashadi. Ermek-ota yuzini o'girdi: «Kerak bo'lsa, soting. Lekin shu qayiqlar qirq yil bu shaharchani boqqan.»",
  "ev.salvage.salvage": "Qayiqlarni temirga sotamiz",
  "ev.salvage.keep": "Yotgan joyida qolsin",

  "ev.spring_flood.title": "Toshqin kelmoqda",
  "ev.spring_flood.body":
    "Bu yil olis tog'larga qalin qor tushdi, Dilnoza bahorda daryo qirg'oqdan toshishini kutyapti. Toshqinni ariqlar orqali dalaga bursak, tuproqdagi tuzni yuvib ketadi; o'z holiga qo'ysak, omborlarni ham yuvib ketadi.",
  "ev.spring_flood.channel": "Toshqinga ariq qazaymiz",
  "ev.spring_flood.let": "Daryo o'z bilganicha oqsin",

  "ev.cold_winter.title": "Qahraton qish",
  "ev.cold_winter.body":
    "Ayoz haftalab qo'yib yubormayapti, qurigan dengiz tubida esa shamolni to'sadigan hech narsa yo'q. Saida opa har bir uyda yo'tal sanaydi. Janubdan keladigan o'tin qimmat, lekin zotiljam bundan ham qimmatga tushadi.",
  "ev.cold_winter.firewood": "Har uyga o'tin olib beramiz",
  "ev.cold_winter.endure": "O'ranib-chirmanib chidaymiz",

  "ev.pelicans.title": "Saqoqushlar qaytdi",
  "ev.pelicans.body":
    "Dilnoza sizni tong otmasdan uyg'otib ko'rsatadi: yangi qamishzorda bir to'da saqoqush in qurib olibdi. O'ttiz yoshdan kichiklar ularni bu yerda hech qachon ko'rmagan. Bolalar allaqachon yashirincha tomoshaga chiqishyapti — miltiq ko'targan bir-ikki kishi ham.",
  "ev.pelicans.protect": "Qamishzorga qorovul qo'yamiz",
  "ev.pelicans.ignore": "Tabiat o'zi hal qiladi",

  "ev.scientist.title": "Poytaxtdan olim",
  "ev.scientist.body":
    "Dilnozaning eski ustozi yerimizdagi tuzni o'lchagani keldi. Uni mehmon qilsak, dehqonlarimizga dalani kamroq suv bilan sho'rdan yuvishni o'rgatadi. Yoki tuproq namunalarini unga sotishimiz mumkin — institut naqd to'laydi.",
  "ev.scientist.host": "Mehmon qilamiz",
  "ev.scientist.samples": "Namunalarni sotamiz",

  "ev.inspection.title": "Tuman tekshiruvi",
  "ev.inspection.body":
    "Rais Tolib boshchiligida tuman komissiyasi keldi, tekshiruv qanday o'tishini esa hamma biladi. To'kin dasturxon qog'ozbozlikni yumshatadi. Oddiy, halol qabul esa odatda keyingi rejani og'irlashtiradi.",
  "ev.inspection.feast": "To'kin dasturxon yozamiz",
  "ev.inspection.plain": "Oddiygina kutib olamiz",

  "ev.seeds.title": "Sho'rga chidamli urug'",
  "ev.seeds.body":
    "Yuqori oqimdagi tajriba xo'jaligidan kelgan agronom sho'r yerga moslangan urug' taklif qilyapti: tuzga parvo qilmaydigan qovun va sal ko'proq hosil beradigan bug'doy. Dilnoza unga kafil. Arzon emas, albatta.",
  "ev.seeds.buy": "Urug'ni sotib olamiz",
  "ev.seeds.no": "O'z urug'imiz yetadi",

  "ev.fish_market.title": "Shaharga quritilgan baliq",
  "ev.fish_market.body":
    "Shahar savdogarlari Oqtosh yerto'lalarida hali baliq borligini eshitishibdi. Quritilgan zog'ora baliq uchun yaxshi pul to'lashadi — shaharchaga juda kerakli pul, ammo keyinroq kerak bo'lib qolishi mumkin bo'lgan ovqat.",
  "ev.fish_market.sell": "Ortiqchasini sotamiz",
  "ev.fish_market.keep": "Qishga asraymiz",

  "ev.clinic_overload.title": "Bemorlar ko'payib ketdi",
  "ev.clinic_overload.body":
    "Saida opa ikki kundan beri mijja qoqmadi; eshigi oldidagi navbat ko'cha oxirigacha cho'zilgan. «Ularga eng ko'p yaxshi ovqat yordam beradi. Shahardan dori tezroq yordam beradi. Hech narsa qilmaslik esa hech kimga yordam bermaydi.»",
  "ev.clinic_overload.rations": "Qo'shimcha ovqat ulashamiz",
  "ev.clinic_overload.medicine": "Shahardan dori keltiramiz",
  "ev.clinic_overload.nothing": "Ajratadigan hech narsa yo'q",

  "ev.canal_breach.title": "Kanal buzildi",
  "ev.canal_breach.body":
    "Dilnoza tizzagacha loyga botib keldi: kanalning devori o'pirilib, suv qumga oqib ketyapti. Hozir yamaymizmi, yo o'sha bo'lakdan voz kechib, narigi dalalarni o'z holiga tashlab qo'yamizmi?",
  "ev.canal_breach.repair": "Kanalni tuzatamiz",
  "ev.canal_breach.abandon": "O'sha bo'lakdan voz kechamiz",

  "ev.camels.title": "Tuyakashlar",
  "ev.camels.body":
    "Tuyalarni qishlovga haydab ketayotgan cho'ponlar saksovulzorimizda boqishga ruxsat so'rashyapti. Yaxshi pul taklif qilishyapti; Timurning aytishicha, tuyalar yaxshi saksovulni ham yeb qo'yadi.",
  "ev.camels.allow": "Boqaverishsin",
  "ev.camels.refuse": "Aylanib o'tishsin",

  "ev.navruz.title": "Navro'z yaqin",
  "ev.navruz.body":
    "Bahor kelyapti, Timurning do'stlari bobolaridek maydonda tun bo'yi sumalak pishirmoqchi. Buning uchun don va ozgina pul kerak — evaziga odamlarda bahorga ishonish uchun sabab paydo bo'ladi.",
  "ev.navruz.celebrate": "Hammamiz birga nishonlaymiz",
  "ev.navruz.quiet": "Har kim o'z uyida",

  "ev.resettle.title": "Ko'chirish taklifi",
  "ev.resettle.body":
    "Rais Tolib ro'yxat olib keldi: sug'oriladigan yerlardagi yangi qishloqqa ko'chishga rozi oilalarga tovon puli beriladi, tuman esa har bir oila uchun shaharchaga ham to'laydi. Og'iz kamayadi, qo'l ham kamayadi — Oqtoshdan ham bir parcha ketadi.",
  "ev.resettle.accept": "Ro'yxatga imzo chekamiz",
  "ev.resettle.refuse": "Oqtosh birga qoladi",

  "ev.rain.title": "Tog'larda yomg'ir",
  "ev.rain.body":
    "Yuqorida kamdan-kam yog'adigan yomg'irlar boshlandi, Dilnozaning aytishicha, daryo bir muddat to'lib oqadi. Hozir ariqlarni tozalasak, ko'proq suv ushlab qolamiz; aks holda yetib kelganiga shukr qilamiz.",
  "ev.rain.store": "Ariqlarni tozalaymiz",
  "ev.rain.enjoy": "Yomg'irdan bahramand bo'lamiz",

  "ev.volunteers.title": "To'g'on uchun talabalar",
  "ev.volunteers.body":
    "Shaharcha chetida Dilnoza o'qigan institutning talabalari bilan to'la avtobus to'xtadi. Ular Katta to'g'on haqida eshitishibdi va bir fasl unda ishlab berishmoqchi — agar Oqtosh ularni boqa olsa.",
  "ev.volunteers.host": "Kutib olib, boqamiz",
  "ev.volunteers.decline": "Rahmat aytib, qaytaramiz",

  "ev.weavers.title": "Qamish to'quvchilar",
  "ev.weavers.body":
    "Timur do'stlari bilan qamishdan bo'yra va savat to'qishni boshladi — ajabki, juda chiroyli chiqyapti. Yuqoridagi qishloqdan keksa usta kelib, ularni chinakamiga o'rgatishi mumkin. Yo bo'lmasa, qamishni xomligicha sotamiz.",
  "ev.weavers.teach": "Keksa ustani yollaymiz",
  "ev.weavers.sell": "Qamishni xomligicha sotamiz",

  "ev.dust_cough.title": "Bolalar yo'talmoqda",
  "ev.dust_cough.body":
    "Tuz changi hamma yoqqa kiradi — nonga, ko'rpaga, o'pkaga. Saida opaning aytishicha, eng ko'p kichkintoylar qiynalyapti. Mato niqoblar yordam beradi; bolalarni bir faslga yuqoridagi qarindoshlarnikiga jo'natish undan ham foydaliroq, lekin bu ota-onalarga yoqmaydi.",
  "ev.dust_cough.masks": "Bolalarga niqob olamiz",
  "ev.dust_cough.send": "Bolalarni qarindoshlarnikiga jo'natamiz",
  "ev.dust_cough.ignore": "Katta bo'lsa o'tib ketadi",

  "ev.tourists.title": "Kemalar qabristoniga mehmonlar",
  "ev.tourists.body":
    "Dengiz tubida zanglab yotgan qayiqlarni suratga olgani bir mikroavtobus sayyoh keldi. Ermek-ota ularni aylantirib, dengiz qanday bo'lganini so'zlab berishi mumkin — haq evaziga va unutilmasligi uchun.",
  "ev.tourists.guide": "Ermek-ota yo'l boshlasin",
  "ev.tourists.no": "Qaytarib yuboramiz",

  "ev.prices.title": "Don narxi oshadi",
  "ev.prices.body":
    "Rais Tolib og'zidan gullab qo'ydi: kelasi fasl tumanda don narxi keskin oshar ekan. Oqtosh hozir sotib olsa, omborlar bugungi narxda to'ladi. Kutsak, omadimiz kelishi ham, kelmasligi ham mumkin.",
  "ev.prices.stock": "Hoziroq g'amlab olamiz",
  "ev.prices.wait": "Kutib ko'ramiz",

  // ---------------------------------------------------------------- yakunlar
  "end.E1.title": "Kichik dengiz qaytdi",
  "end.E1.text":
    "Katta to'g'on ortida shimoliy qo'ltiq yana to'ldi — ko'kimtir, tirik suv; baliqdan oldin chag'alaylar qaytib keldi. Bir necha yil oldin sho'rxok sahro bo'lgan joyda Ermek-ota nevarasini qayiqda suzdirib yuribdi. Ochiq dengiz hamon chekinyapti, lekin Oqtosh uning bir bo'lagini saqlab qoldi — baliq tutishga, cho'milishga, bahslashishga yetadi. Shu yil tug'ilgan bolalar dengiz bo'yidagi shaharcha dunyodagi eng oddiy narsa deb o'sadi.",
  "end.E1.cond": "Katta to'g'on qurilgan, ortida 8+ suvli katak, aholi 120+, sog'liq 60+",
  "end.E2.title": "Yashil delta",
  "end.E2.text":
    "Dengiz qaytmadi, ammo yer ham o'lmadi. To'lqinlar urilgan joyda endi qamishzor shivirlaydi, unda saqoqushlar in quradi, saksovul qatorlari esa tuzli shamolni to'sib turadi. Oqtosh bo'yra to'qiydi, kanallarda baliq tutadi, chuchuk suvni hali unutmagan tuproqda qovun yetishtiradi. Bu bobolaringiz bilgan shaharcha emas — bu yangi, yam-yashil Oqtosh.",
  "end.E2.cond": "10+ qamishzor, aholi 80+, tuproqning o'rtacha sho'rligi 45 dan past",
  "end.E3.title": "Paxta shahri",
  "end.E3.text":
    "Oqtosh boy. Yangi tomlar, asfalt maydon, har ikki hovlining birida mototsikl — ufqqacha oppoq dalalar: paxtadan oq, tuzdan yanada oq. Shifokor eshigidagi navbat hech qisqarmaydi, quduqlar esa yo'qolgan dengizning ta'mini beradi. Rais Tolib Oqtoshni namunali shaharcha deb ataydi. Ketishga qurbi yetgan hech kim qirq yoshdan keyin bu yerda qolmaydi.",
  "end.E3.cond": "Aholi 80+, tuproqning o'rtacha sho'rligi 60+",
  "end.E4.title": "Kemalar qabristoni",
  "end.E4.text":
    "Oqtosh o'n yilga bardosh berdi. Endi u kichikroq, jimjitroq, dengiz esa ufq ortida qayerdadir — eshitilgan gapday. Eski qayiqlar yorilib ketgan dengiz tubida uzun, egri-bugri qatorda zanglab yotibdi, kechqurunlari keksalar ularning yoniga borib o'tirishadi. Bu yerda hali odamlar yashaydi. Yana o'n yildan keyin ham yashaydimi — buni hech kim taxmin qilgisi kelmaydi.",
  "end.E4.cond": "10 yil omon qolish, lekin yaxshiroq yakunsiz",
  "end.E5.title": "Ko'chib ketish",
  "end.E5.text":
    "Avval asta-sekin, keyin birdaniga bo'ldi. Dastlab yoshlar ketdi, so'ng boshqa joyda qarindoshi borlar, keyin yuk mashinasi topa olgan hamma. Oxirgilar tavaqalarni mixlab, kalitni ostona tagiga qo'yib ketishdi — go'yo qaytib keladigandek. Endi Oqtosh eshiklari oldiga qum uyiladi, shamol bilan bahslashadigan odam qolmadi.",
  "end.E5.cond": "Aholi 20 dan kam yoki umid 0",
  "end.E6.title": "Ochlik",
  "end.E6.text":
    "Ikki fasl nonsiz qolish Oqtoshning kuchidan tashqari edi. Omborlar supurib-sidirildi, oxirgi echkilar ham so'yildi, tumanning don mashinasi esa juda kech va juda oz olib keldi. Yura oladiganlar daryo bo'ylab yuqoriga ketishdi. Saida opa oxirigacha qoldi va har bir ismni yozib qo'ydi.",
  "end.E6.cond": "Oziq-ovqat ketma-ket 2 fasl 0 da",
  "end.E7.title": "Lavozimdan chetlatildingiz",
  "end.E7.text":
    "Uchinchi bajarilmagan reja tuman stoliga tushdi, javob esa bir haftada keldi: mashinkada terilgan xat, qizil muhr va Oqtoshni hech ko'rmagan odamlar tanlagan yangi oqsoqol. Rais Tolib mashina eshigi oldida qo'lingizni siqdi-yu, ko'zingizga qaramadi. Ortingizda butun shaharcha jim kuzatib turdi. Endi dengizning taqdirini boshqa birov hal qiladi.",
  "end.E7.cond": "Paxta rejasi 3 marta bajarilmadi",
};
