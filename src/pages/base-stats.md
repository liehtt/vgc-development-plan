# Base stats/stats/IVs/EVs — VGC guide

Source: https://www.vgcguide.com/base-stats

---

## Base Stats, IVs, EVs

8min 16sec read

Pokemon at its core is numerical– this article is an introduction to the building blocks of Pokemon stats.

Written by Aaron Traylor

Introduction / The Basics

The most important thing to do when beginning to play competitive Pokémon is to pull back the curtain on the math behind Pokémon. For the most part, you won’t need to do any math yourself. However, Pokémon at its core is (in part) a numerical game and you will want to know how its mechanics work to understand teambuilding and battling as best you can.

### Stats

There are six core stats of Pokémon— HP, Attack, Defense, Special Attack, Special Defense, and Speed. Each Pokémon in a battle will have a different value for each of these stats.

“Stat” may also refer to the real value of that Pokemon’s stat. In the below image, Pikachu has an HP stat of 111.

### Base Stats

Each Pokémon species is unique for many reasons, such as their design, typing, abilities, and more. In battle, each Pokémon species has a different value for each of the core stats. To draw an analogy to the real world, each different breed of dog is different-- for example, Dachshunds and Golden Retrievers are naturally skilled at different things.

Practically speaking, each base stat is a value between 1 and 255 (higher is better), and it is the same for every Pokémon of that species. For example, Garchomp has a base Speed stat of 102. Note that this is different from the actual stat in battle at Level 50. The base stat has the largest impact on how the Pokémon’s final stats will look like-- a Snorlax (base 30 Speed) won’t ever outspeed Garchomp unless the Garchomp is especially slow and the Snorlax is especially fast.

### IVs

Each species will have different stats, but each Pokémon of that species will have a unique set of IVs, or “individual values”. To continue our analogy, although all Golden Retrievers may have some natural skills, dogs that are born from different parents may be naturally better or worse at each skill.

Practically speaking, each Pokémon has an IV in each stat between 0 and 31 (32 values total), where 0 is the worst and 31 is the best. As far as VGC goes, you’ll usually want Pokémon with 31s in all stats, which are fairly easy to get with our guide. One important exception is when you’d want a Pokémon with a 0 Speed IV, in order to underspeed another Pokémon in Trick Room. You can read more about this and other IV exceptions here.

### EVs

Each Pokémon can then be “trained” in its stats, just like dogs can be trained to be more agile or quick (last time for the dogs metaphor, we promise!) Practically speaking, a Pokémon can have a maximum of 510 EVs, or “effort values”, that can be allocated between its stats. At Level 100 (which we don’t use in VGC), 4 EVs equals one stat point. At Level 50, the first 4 EVs equals one stat point, and then every 8 after that equals one more. A stat can have a maximum of 252 EVs in it before you can’t put any more into it (practically speaking-- it goes up to 255 in game, but that will never get you a stat point).

EVs are the highest level of customization and variability that Pokémon allows, and it can be overwhelming to know how to apply them to your Pokémon. For some beginner-friendly information, click here. To learn how to apply EVs to your Pokémon in Pokémon Sword and Shield, click here.

### Natures

Each Pokémon has one of 25 natures, most of which drops a stat by 10% and increases a stat by 10% (some natures do nothing!). This is calculated after base stats, IVs, and EVs are applied. A Pokémon can only have one nature, but it’s easy to change a Pokémon’s nature in game using mints. Usually, you’ll use a nature to boost a high stat of a Pokémon and drop an irrelevant stat. If you want to take advantage of Gengar’s natural Speed stat, you’ll want a nature that boosts it’s Speed-- and if you aren’t using physical attacks, you’ll want to drop its Attack, meaning you’d use a Timid nature.

After the Nature is applied to a Pokémon’s stats, the numbers will line up with what you see on the Summary screen for that Pokémon in game.

In the left image below, Pikachu has a nature that doesn’t affect its stats. In the right image, it has the Timid nature, which boosts its Speed stat by 10% and drops its Attack stat by 10%.

*footnote: We’re going to choose a nature which drops the Attack stat, even though Pikachu has Fake Out. This is because Fake Out is usually used for its utility and not its damage. This is a very minor optimization because Pikachu has Focus Sash anyway, but it’s the standard practice.

Neutral nature

Timid nature

### Damage Calculation

Pokémon deal damage according to the damage formula, which is affected by many things, but mostly the attacking Pokémon’s Attack or Special Attack stat (depending on the selected move), the defending Pokémon’s Defense or Special Defense, and whether the Attack is super effective or not very effective (see the Types section below). The damage formula is complex and you won’t have to learn it (none of us know it!), but you should know that moves deal damage in a range. Each damage roll can take one of 16 values, which are between a low value (called a min roll) and a high value (called a max roll). Here, we see that Excadrill’s Iron Head onto Sylveon does between 198 and 234 damage, or between 98% and 115.8% of Sylveon’s HP-- so it might not always knock Sylveon out! (credit to Pikalytics ).

﻿

### Typing

The type chart is one of the most basic elements of Pokémon-- there are 18 “types” in Pokémon-- each Pokémon has one or two types. When a move is used on a Pokémon, there is an attacking type (the type of the move) and defending type(s) (the types of the Pokémon the move is being used on). A damage modifier is calculated based on the interaction between the attacking and defending type(s).

Furthermore, there is a bonus damage modifier (x1.5) applied if your Pokémon uses a move of one of its types. This is called STAB (short for Same-Type Attacking Bonus). This STAB bonus makes a big difference in how much damage your moves do!

Type charts are hard to look at, and the best way to learn them is to remember them over time. If you’re playing on Pokemon Showdown, there’s a command to find out what types are weak to which other types-- for example, you can type `/weak Pikachu` into the chatbox to find out what types Pikachu is weak to, or `/data Fire` to find out about the Fire-type.

### Boosts and Drops

Another important piece of the numbers puzzle is boosts and drops, which are multiplicative modifiers to each stat. For example, if Scizor clicks Swords Dance, it boosts its Attack by two stages, or goes to +2 Attack. Its Bullet Punch is now twice as strong as it was the turn before. If Incineroar then Intimidates it, Scizor is at +1 Attack, or 1.5 times as strong as a normal physical attack. These reset when the Pokémon is switched out.

One easy way to remember what the multiplier is without looking at this chart is to remember that the multiplier is based on the fraction 2/2. When you get a boost, you add that boost to the top, and a drop is added to the bottom. A Pokémon at +3 is at 5/2, or 2.5 times. A Pokémon at -4 is at 2/6 or 0.33 modifier.

#### Accuracy/Evasion:

The trick for accuracy and evasion is the same as the other stats, but the fraction you modify is 3/3 instead of 2/2. At +3 accuracy, a Pokémon is at 6/3 modifier or 2x as likely to connect. At -5 accuracy a Pokémon is at 3/8 accuracy and will connect less than 40% of the time (assuming they started with a 100% accurate move.

### Wrapping Up

If this is your first time looking at the math of Pokémon, it may feel like a lot to keep track of. If you’re overwhelmed, don’t worry– it took us a long time to learn these things as well. There’s no need to make flash cards in order to remember the information in this guide. Rather, you’ll learn all of the details over time as you play more competitive Pokémon. We recommend playing competitive battles and learning how all of these numbers interact during the game. One other way to learn could be to play battles in the story mode or Battle Tower of a Pokémon game, and keep track of how stats and damage multipliers change. These details will become second nature over time.

Introduction Home

Introduction Home

Next In The Basics: What Is Pokemon Showdown

Next In The Basics: What Is Pokemon Showdown
