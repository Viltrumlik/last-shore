// Story, event, advisor and ending text - English.
export const STORY_EN: Record<string, string> = {
  // ---------------------------------------------------------------- title & setting
  "story.title": "Last Shore",
  "story.tagline": "Ten years. One town. A sea that is leaving.",
  "story.teaser":
    "Every season the Kok Sea retreats a little further from Oqtosh, leaving boats on their sides and salt on the wind. As the town's new elder you have ten years to decide what to save: the cotton that pays the district, the fields that feed your people, or the water itself. Plant reeds and saxaul, dig canals, gamble on the Great Dike — or watch the town follow the sea away.",
  "story.setting":
    "Oqtosh is a fishing town on the shore of the Kok Sea, an inland sea fed by two rivers. Upstream, those rivers are being turned onto the cotton fields, and the sea is shrinking.",

  // ---------------------------------------------------------------- advisors
  "adv.ermek": "Ermek-ota",
  "adv.ermek.role": "old fisherman",
  "adv.dilnoza": "Dilnoza",
  "adv.dilnoza.role": "hydro-engineer",
  "adv.tolib": "Rais Tolib",
  "adv.tolib.role": "district official",
  "adv.saida": "Doctor Saida",
  "adv.saida.role": "town doctor",
  "adv.timur": "Timur",
  "adv.timur.role": "voice of the youth",
  "adv.elder": "The Elder",
  "adv.elder.role": "you",

  // ---------------------------------------------------------------- story beats
  "ev.intro.title": "A New Elder for Oqtosh",
  "ev.intro.body":
    "The council has chosen you, and all of Oqtosh has gathered at the old harbour to see what its new elder is made of. Ermek-ota points his stick at the grey water: “The Kok Sea steps back a little every spring, child. It won't stop on its own.” Dilnoza, just back from the capital with her canal drawings, says ten years is enough to change that — if you start today.",
  "ev.intro.go": "Let's get to work",

  "ev.quota_first.title": "The Cotton Plan",
  "ev.quota_first.body":
    "Rais Tolib arrives in the district's dusty car and unrolls a paper with a red stamp. Every autumn Oqtosh owes the district {q} bales of cotton — your stores hold {have} right now. Deliver, and the district pays; fall short, and you can buy the rest from the neighbours. “Fail the plan three times,” he adds pleasantly, “and the district will find a new elder.”",
  "ev.quota_first.deliver": "Deliver the cotton",
  "ev.quota_first.bargain": "Try to bargain",
  "ev.quota_first.refuse": "Refuse the plan",

  "ev.quota.title": "Autumn: the Plan Is Due",
  "ev.quota.body":
    "Rais Tolib is back with the same red stamp. This year the district wants {q} bales of cotton; your stores hold {have}. Failed plans on the town's record so far: {fails} — the third one will be the last.",
  "ev.quota.deliver": "Deliver the cotton",
  "ev.quota.bargain": "Haggle for a delay",
  "ev.quota.refuse": "Refuse the plan",
  "ev.quota.deliver.done":
    "The cotton is delivered and the papers are stamped. The district paid {pay} so'm, and the leftover bales fetched {extra} so'm at the bazaar.",
  "ev.quota.bargain.win":
    "Tolib sighs and agrees to wait — but a quarter of this year's plan will be added to next autumn. The leftover cotton fetched {extra} so'm. Failed plans on record: {fails} of 3.",
  "ev.quota.bargain.warn": "Rais Tolib would not bargain, but he did not make a scene either: he simply wrote half the plan, {add} bales, onto next year's quota. \"It won't work a second time,\" he warned. The leftover cotton sold at the bazaar for {extra} so'm.",
  "ev.quota.bargain.lose":
    "The haggling went badly, and Tolib wrote it down as a failed plan — {fails} of 3. The cotton you had fetched {extra} so'm at the bazaar.",
  "ev.quota.refuse.done":
    "You sent Tolib away empty-handed and sold the cotton at the bazaar for {extra} so'm. The district will take a little more of the river upstream. Failed plans on record: {fails} of 3.",

  "ev.harbour.title": "The Old Harbour Runs Dry",
  "ev.harbour.body":
    "The water is walking away from the old piers, and the first boats already lie on their sides in the salt. Ermek-ota stands where the jetty once touched the waves. “We can drag the fleet after the sea for {cost} so'm,” he says, “or leave the old girls be. One day people will come to see what a sea looked like.”",
  "ev.harbour.museum": "Leave them — let them remember",
  "ev.harbour.move": "Move the fleet to the water",
  "ev.harbour.scrap": "Break the hulls for timber",
  "ev.harbour.move.done":
    "With ropes, rollers and half the town pulling, the fleet reached the new waterline — boats saved: {moved}. Ermek-ota cried a little and blamed the wind.",

  "ev.storm_warning.title": "A Storm Is Gathering",
  "ev.storm_warning.body":
    "Dilnoza has been reading the winds all winter, and she doesn't like the numbers. “In spring the whole dry seabed will rise into the sky — a salt storm like nobody here has ever seen.” Saxaul planted now will take the worst of it; for the rest, people need to prepare.",
  "ev.storm_warning.masks": "Sew masks for every family",
  "ev.storm_warning.wells": "Cover the wells",
  "ev.storm_warning.nothing": "We have weathered storms before",

  "ev.storm_after.title": "After the Salt Storm",
  "ev.storm_after.body":
    "For three days the sky was white. Doctor Saida walks the streets with a scarf over her mouth; salt lies on every roof. “{dust} measures of dust settled on the homes, and the soil's salinity is up to {sal}. We clean it now, or we breathe it all year.”",
  "ev.storm_after.clean": "Scrub the streets and roofs",
  "ev.storm_after.wash": "Wash it off with river water",
  "ev.storm_after.endure": "Leave it — the wind will take it",

  "ev.epidemic.title": "Doctor Saida's Warning",
  "ev.epidemic.body":
    "Saida has seen the first cases: fever, cramps, children too weak to stand. “It's the water — brackish wells and salt dust. Give me a proper clinic and clean water now, or we will be counting graves by autumn.” Clinics in Oqtosh right now: {clinics}.",
  "ev.epidemic.clinic": "Fund the clinic",
  "ev.epidemic.water": "Bring emergency clean water",
  "ev.epidemic.ignore": "Hope it passes",
  "ev.epidemic.hit": "The fever came anyway. {dead} people did not survive it, and the whole town walked behind their coffins.",
  "ev.epidemic.spared": "The fever touched a few houses and passed on. Doctor Saida finally slept through a night.",

  "ev.dike_plan.title": "The Great Dike",
  "ev.dike_plan.body":
    "Dilnoza spreads a long drawing across the council table. “The northern bay is shallow. Close its mouth with a dike {tiles} tiles long and we can hold every drop we give it — and let the open sea go.” Four seasons of hard work, money every season and every spare pair of hands. “A small sea,” she says, “is better than none.”",
  "ev.dike_plan.approve": "Approve the plan",
  "ev.dike_plan.later": "Not now",

  "ev.aid.title": "Visitors from Abroad",
  "ev.aid.body":
    "A white jeep, a translator and three smiling people with notebooks. A foreign mission offers a generous grant — in exchange for “studying” Oqtosh: photographs of sick children, interviews, blood samples. Rais Tolib is delighted. The whole town is waiting for your answer.",
  "ev.aid.accept": "Take the money",
  "ev.aid.refuse": "We are not an exhibit",

  // ---------------------------------------------------------------- random events
  "ev.locusts.title": "Locusts",
  "ev.locusts.body":
    "A brown cloud rolled in from the dry steppe at dusk, and by morning the wheat was hissing with locusts. Ermek-ota has seen this twice in his life. “Poison them, smoke them or pray — but decide before the autumn harvest.”",
  "ev.locusts.spray": "Spray the fields with poison",
  "ev.locusts.smoke": "Light smoky fires around the fields",
  "ev.locusts.pray": "Pray and wait",

  "ev.caravan.title": "A Caravan from the South",
  "ev.caravan.body":
    "Timur comes running, out of breath: trucks and camels at the edge of town, merchants selling flour and buying anything woven. Their prices aren't kind, but their sacks are full.",
  "ev.caravan.buy": "Buy flour",
  "ev.caravan.sell": "Sell reed mats",
  "ev.caravan.pass": "Let them move on",

  "ev.wedding.title": "A Wedding in Oqtosh",
  "ev.wedding.body":
    "Timur's cousin is getting married, and half the town is already arguing about the pilaf. A real feast would lift everyone's spirits — and empty a fair part of the stores.",
  "ev.wedding.feast": "A proper wedding feast",
  "ev.wedding.modest": "A modest celebration",
  "ev.wedding.postpone": "Ask them to wait a season",

  "ev.fish_dieoff.title": "Silver on the Water",
  "ev.fish_dieoff.body":
    "This morning the nets came up full of dead fish, belly-up and white with salt. Ermek-ota says the water near the shore has turned too bitter. “Send the boats far out, where the fish are still alive — that costs fuel. Or we eat less until it passes.”",
  "ev.fish_dieoff.far": "Send the boats far out",
  "ev.fish_dieoff.accept": "Fish close and catch less",

  "ev.sandstorm.title": "The Dry Wind",
  "ev.sandstorm.body":
    "A hot wind is blowing off the exposed seabed, and it carries the sea's salt with it. Doctor Saida asks for shutters and wet cloths on every window before the old and the very young start coughing.",
  "ev.sandstorm.shutters": "Seal up the houses",
  "ev.sandstorm.endure": "Wait it out",

  "ev.school.title": "The School Roof",
  "ev.school.body":
    "Timur brings a petition signed by every pupil in Oqtosh: the school roof leaks, and the last teacher is threatening to leave for the city. “No school here means no future here,” he says, very seriously.",
  "ev.school.fund": "Fix the roof, pay the teacher",
  "ev.school.refuse": "There's no money for that",

  "ev.youth_leave.title": "The Young Want to Leave",
  "ev.youth_leave.body":
    "About ten young people have packed their bags for the city, and Timur is the loudest of them. “There's no work here but salt and waiting.” They could leave with your blessing and send money home — or you could give them a reason to stay.",
  "ev.youth_leave.bless": "Let them go with a blessing",
  "ev.youth_leave.persuade": "Create jobs to keep them",
  "ev.youth_leave.forbid": "Forbid it",

  "ev.salty_well.title": "The Well Turns Bitter",
  "ev.salty_well.body":
    "The water in the town well tastes of salt now, and Doctor Saida's patients noticed before she did. A deeper well would reach cleaner water; boiling it over saxaul firewood helps a little; doing nothing, we will pay for with our health.",
  "ev.salty_well.dig": "Dig a deeper well",
  "ev.salty_well.boil": "Boil the water",
  "ev.salty_well.ignore": "We'll get used to it",

  "ev.cotton_boom.title": "An Advance on Cotton",
  "ev.cotton_boom.body":
    "Rais Tolib is in an unusually good mood: cotton prices are up, and the district will pay an advance right now — if Oqtosh promises a bigger delivery next autumn. Money today, a heavier plan tomorrow.",
  "ev.cotton_boom.accept": "Take the advance",
  "ev.cotton_boom.decline": "Keep the plan as it is",

  "ev.salvage.title": "Scrap Dealers",
  "ev.salvage.body":
    "Two men with a cutting torch and a truck want the dead hulls on the seabed — they'll pay for {n} of them. Ermek-ota turns away. “Sell them if you must. But those boats fed this town for forty years.”",
  "ev.salvage.salvage": "Sell the hulls for scrap",
  "ev.salvage.keep": "Leave them where they lie",

  "ev.spring_flood.title": "Meltwater Is Coming",
  "ev.spring_flood.body":
    "Snow in the far mountains was heavy this year, and Dilnoza expects the river to burst its banks in spring. Channelled onto the fields, the flood would wash salt out of the soil; left alone, it will wash out the storehouses too.",
  "ev.spring_flood.channel": "Dig channels for the flood",
  "ev.spring_flood.let": "Let the river run wild",

  "ev.cold_winter.title": "A Bitter Winter",
  "ev.cold_winter.body":
    "The frost has not let go for weeks, and on the dry seabed there is nothing to break the wind. Doctor Saida counts coughs in every house. Firewood from the south is expensive — but pneumonia costs more.",
  "ev.cold_winter.firewood": "Buy firewood for every home",
  "ev.cold_winter.endure": "Bundle up and endure",

  "ev.pelicans.title": "The Pelicans Return",
  "ev.pelicans.body":
    "Dilnoza wakes you before dawn to show you: a whole flock of pelicans nesting in the new reed beds. Nobody under thirty has ever seen one here. The children are already sneaking out to look — and so are a couple of men with guns.",
  "ev.pelicans.protect": "Hire a warden for the reeds",
  "ev.pelicans.ignore": "Let nature sort it out",

  "ev.scientist.title": "A Scientist from the Capital",
  "ev.scientist.body":
    "Dilnoza's old professor has come to measure the salt in our soil. Feed and house him, and he will teach our farmers to leach fields with less water. Or sell him soil samples — the institute pays in cash.",
  "ev.scientist.host": "Host him as a guest",
  "ev.scientist.samples": "Sell him samples",

  "ev.inspection.title": "District Inspection",
  "ev.inspection.body":
    "A district commission arrives with Rais Tolib at its head, and everyone knows how inspections go. A generous dinner tends to soften the paperwork. A plain, honest welcome tends to make the next plan heavier.",
  "ev.inspection.feast": "Lay on a lavish dinner",
  "ev.inspection.plain": "Receive them plainly",

  "ev.seeds.title": "Salt-Tolerant Seeds",
  "ev.seeds.body":
    "An agronomist from the experimental farm upriver offers seeds bred for salty soil: melons that shrug off salt and wheat that yields a little more. Dilnoza vouches for him. They aren't cheap.",
  "ev.seeds.buy": "Buy the seeds",
  "ev.seeds.no": "Stick to our own seed",

  "ev.fish_market.title": "Dried Fish for the City",
  "ev.fish_market.body":
    "City traders have heard that Oqtosh still has fish in its cellars. They'll pay well for dried carp — money the town badly needs, food the town might need later.",
  "ev.fish_market.sell": "Sell the surplus",
  "ev.fish_market.keep": "Keep it for winter",

  "ev.clinic_overload.title": "Too Many Patients",
  "ev.clinic_overload.body":
    "Doctor Saida hasn't slept in two days; the queue outside her door reaches the end of the street. “Good food would help them most. Medicine from the city would help faster. Doing nothing helps no one.”",
  "ev.clinic_overload.rations": "Hand out extra rations",
  "ev.clinic_overload.medicine": "Order medicine from the city",
  "ev.clinic_overload.nothing": "We can't spare anything",

  "ev.canal_breach.title": "A Canal Breaks",
  "ev.canal_breach.body":
    "Dilnoza comes in muddy to the knees: a canal wall has collapsed and the water is running off into the sand. Patch it now, or give up that stretch and let the fields beyond it fend for themselves.",
  "ev.canal_breach.repair": "Repair the canal",
  "ev.canal_breach.abandon": "Abandon that stretch",

  "ev.camels.title": "Camel Herders",
  "ev.camels.body":
    "Herders driving camels to their winter pastures ask to graze them in our saxaul belts. They offer good money; camels, Timur points out, also eat good saxaul.",
  "ev.camels.allow": "Let them graze",
  "ev.camels.refuse": "Send them around",

  "ev.navruz.title": "Navruz Is Near",
  "ev.navruz.body":
    "Spring is coming, and Timur's friends want to cook sumalak all night in the square, as their grandparents did. It costs grain and a little money — and gives people a reason to believe in spring.",
  "ev.navruz.celebrate": "Celebrate together",
  "ev.navruz.quiet": "A quiet family holiday",

  "ev.resettle.title": "An Offer to Resettle",
  "ev.resettle.body":
    "Rais Tolib brings a list: families willing to move to a new settlement on the irrigated lands will be compensated, and the district will pay the town for each of them. Fewer mouths, fewer hands — and a little less of Oqtosh.",
  "ev.resettle.accept": "Sign the list",
  "ev.resettle.refuse": "Oqtosh stays together",

  "ev.rain.title": "Rain in the Mountains",
  "ev.rain.body":
    "Rare rains are falling upstream, and Dilnoza says the river will run fuller for a while. If we clean the channels now, we can catch more of it; otherwise we'll be glad of whatever reaches us.",
  "ev.rain.store": "Clean the channels",
  "ev.rain.enjoy": "Enjoy the rain",

  "ev.volunteers.title": "Students for the Dike",
  "ev.volunteers.body":
    "A bus full of students from Dilnoza's old institute has stopped at the edge of town. They heard about the Great Dike and want to work on it for a season — if Oqtosh can feed them.",
  "ev.volunteers.host": "Welcome and feed them",
  "ev.volunteers.decline": "Thank them and send them home",

  "ev.weavers.title": "Reed Weavers",
  "ev.weavers.body":
    "Timur and his friends have started weaving mats and baskets from our reeds, and they're surprisingly good at it. An old master from upriver could teach them properly — or we sell the reeds raw.",
  "ev.weavers.teach": "Hire the old master",
  "ev.weavers.sell": "Sell the raw reeds",

  "ev.dust_cough.title": "Children Coughing",
  "ev.dust_cough.body":
    "Salt dust gets into everything — bread, bedding, lungs. Doctor Saida says the little ones suffer most. Cloth masks would help; sending the children to relatives upriver for a season would help more, though their parents won't like it.",
  "ev.dust_cough.masks": "Buy masks for the children",
  "ev.dust_cough.send": "Send the children upriver",
  "ev.dust_cough.ignore": "They'll grow out of it",

  "ev.tourists.title": "Visitors to the Ship Graveyard",
  "ev.tourists.body":
    "A minibus of travellers has come to photograph the rusting boats on the seabed. Ermek-ota could show them around and tell them what the sea used to be — for a fee, and for the sake of remembering.",
  "ev.tourists.guide": "Let Ermek-ota guide them",
  "ev.tourists.no": "Turn them away",

  "ev.prices.title": "Grain Prices Will Rise",
  "ev.prices.body":
    "Rais Tolib lets it slip that grain in the district will jump in price next season. If Oqtosh buys now, the stores fill at today's price. If we wait, we might be lucky — or we might not.",
  "ev.prices.stock": "Stock up now",
  "ev.prices.wait": "Wait and see",

  // ---------------------------------------------------------------- endings
  "end.E1.title": "The Small Sea Returns",
  "end.E1.text":
    "Behind the Great Dike the northern bay fills again, grey-green and alive, and the gulls come back before the fish do. Ermek-ota takes his grandson out in a boat over water that was salt desert a few years ago. The open sea is still leaving, but Oqtosh has kept a piece of it — enough to fish in, to swim in, to argue about. Children born this year will grow up thinking a town by the sea is the most ordinary thing in the world.",
  "end.E1.cond": "Great Dike complete, 8+ water tiles behind it, population 120+, health 60+",
  "end.E2.title": "Green Delta",
  "end.E2.text":
    "The sea did not come back, but the land did not die either. Reed beds whisper where the waves used to break, pelicans nest in them, and the saxaul belts hold back the salt wind. Oqtosh weaves mats, fishes the channels and grows melons in soil that still remembers fresh water. It is not the town your grandparents knew — it is a new one, and it is green.",
  "end.E2.cond": "10+ reed beds, population 80+, average soil salinity below 45",
  "end.E3.title": "Cotton Town",
  "end.E3.text":
    "Oqtosh is rich. New roofs, a paved square, a motorcycle in every other yard — and white fields to the horizon, white with cotton and whiter still with salt. The queue at the doctor's door never gets shorter, and the wells taste of the sea that is gone. Rais Tolib calls Oqtosh a model town. Nobody who can afford to leave stays past forty.",
  "end.E3.cond": "Population 80+, average soil salinity 60+",
  "end.E4.title": "Ship Graveyard",
  "end.E4.text":
    "Oqtosh survived its ten years. It is smaller now and quieter, and the sea is a rumour somewhere beyond the horizon. The old boats rust on the cracked seabed in a long, crooked line, and in the evenings the old men walk out to sit beside them. People still live here. Whether they will in another ten years, nobody likes to guess.",
  "end.E4.cond": "Survived 10 years without reaching a better ending",
  "end.E5.title": "Exodus",
  "end.E5.text":
    "It happened slowly, and then all at once. First the young left, then the families with relatives elsewhere, then everyone who could find a truck. The last ones nailed the shutters closed and left their keys under the doormats, as if they might come back. Sand drifts against the doors of Oqtosh now, and the wind has no one left to argue with.",
  "end.E5.cond": "Population below 20 or hope at 0",
  "end.E6.title": "Famine",
  "end.E6.text":
    "Two seasons without bread were more than Oqtosh could bear. The stores were swept clean, the last goats were eaten, and the district's grain truck came too late with too little. Those who could still walk went upriver. Doctor Saida stayed to the end and wrote down every name.",
  "end.E6.cond": "Food at 0 for 2 seasons in a row",
  "end.E7.title": "Removed from Office",
  "end.E7.text":
    "The third failed plan landed on a desk in the district, and the answer came back within a week: a typed letter, a red stamp and a new elder chosen by people who have never seen Oqtosh. Rais Tolib shook your hand at the car door and did not meet your eyes. Behind you, the whole town watched in silence. What happens to the sea now is someone else's decision.",
  "end.E7.cond": "The cotton plan failed 3 times",
};
