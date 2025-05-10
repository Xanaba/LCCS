// Shared function to get currency items from the actor's inventory
function getCurrencyItems(actor) {
  const cp = actor.items.find(item => item.name === "Copper Pieces" && item.type === "treasure");
  const sp = actor.items.find(item => item.name === "Silver Pieces" && item.type === "treasure");
  const gp = actor.items.find(item => item.name === "Gold Pieces" && item.type === "treasure");
  const pp = actor.items.find(item => item.name === "Platinum Pieces" && item.type === "treasure");
  console.log("Found currency items:", { cp, sp, gp, pp });
  return { cp, sp, gp, pp };
}

// Function to calculate total currency in copper pieces (cp)
function getTotalCP(actor) {
  const currencyItems = getCurrencyItems(actor);
  let totalCP = 0;
  if (currencyItems.pp) totalCP += (currencyItems.pp.system.quantity || 0) * 1000;
  if (currencyItems.gp) totalCP += (currencyItems.gp.system.quantity || 0) * 100;
  if (currencyItems.sp) totalCP += (currencyItems.sp.system.quantity || 0) * 10;
  if (currencyItems.cp) totalCP += (currencyItems.cp.system.quantity || 0);
  return totalCP;
}

// Function to set currency after deduction or addition
async function setCurrency(actor, totalCP) {
  const currencyItems = getCurrencyItems(actor);
  let remainingCP = totalCP;
  
  const denominations = [
    {item: currencyItems.pp, value: 1000},
    {item: currencyItems.gp, value: 100},
    {item: currencyItems.sp, value: 10},
    {item: currencyItems.cp, value: 1}
  ];
  
  for (let denom of denominations) {
    if (denom.item) {
      const quantity = Math.floor(remainingCP / denom.value);
      await denom.item.update({"system.quantity": quantity});
      remainingCP -= quantity * denom.value;
    }
  }
}

// Earn Income Macro
async function earnIncome() {
  const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
  if (!actor) {
    ui.notifications.warn("Please select a token or assign a character to your user!");
    return;
  }
  if (actor.type !== "character" && actor.type !== "npc") {
    ui.notifications.warn("This macro is designed for characters or NPCs only.");
    return;
  }
  if (game.system.id !== "pf2e") {
    ui.notifications.warn("This macro is designed for the Pathfinder 2e system.");
    return;
  }

  const standardSkills = {
    "Acrobatics": "acrobatics",
    "Arcana": "arcana",
    "Athletics": "athletics",
    "Computers": "computers",
    "Crafting": "crafting",
    "Deception": "deception",
    "Diplomacy": "diplomacy",
    "Intimidation": "intimidation",
    "Medicine": "medicine",
    "Nature": "nature",
    "Occultism": "occultism",
    "Performance": "performance",
    "Piloting": "piloting",
    "Religion": "religion",
    "Society": "society",
    "Stealth": "stealth",
    "Survival": "survival",
    "Thievery": "thievery"
  };

  const occupations = {
    "Corporate Intern": ["Diplomacy", "Deception", "Intimidation"],
    "LCPD Recruit": ["Athletics", "Acrobatics", "Intimidation"],
    "Medical Field - Entry Level": ["Medicine", "Nature"],
    "Jobber/Merc": ["Intimidation", "Athletics", "Acrobatics", "Computers", "Piloting"],
    "Press/Media - Entry Level": ["Diplomacy", "Deception", "Performance"],
    "Day Job - Entry Level": Object.keys(standardSkills),
    "Part-Time Job": Object.keys(standardSkills),
    "Student - University": Object.keys(standardSkills),
    "Gang Member - Initiate": ["Intimidation", "Deception", "Athletics", "Computers", "Thievery"]
  };

  const dcByLevel = {
    0: 14, 1: 15, 2: 16, 3: 18, 4: 19, 5: 20, 6: 22, 7: 23, 8: 24, 9: 26,
    10: 27, 11: 28, 12: 30, 13: 31, 14: 32, 15: 34, 16: 35, 17: 36, 18: 38, 19: 39, 20: 40
  };

  const earnIncomeTable = {
    0: { failed: 1, trained: 5, expert: 5, master: 5, legendary: 5 },
    1: { failed: 2, trained: 20, expert: 20, master: 20, legendary: 20 },
    2: { failed: 4, trained: 30, expert: 30, master: 30, legendary: 30 },
    3: { failed: 8, trained: 50, expert: 50, master: 50, legendary: 50 },
    4: { failed: 10, trained: 70, expert: 80, master: 80, legendary: 80 },
    5: { failed: 20, trained: 90, expert: 100, master: 100, legendary: 100 },
    6: { failed: 30, trained: 150, expert: 200, master: 200, legendary: 200 },
    7: { failed: 40, trained: 200, expert: 250, master: 250, legendary: 250 },
    8: { failed: 50, trained: 250, expert: 300, master: 300, legendary: 300 },
    9: { failed: 60, trained: 300, expert: 400, master: 400, legendary: 400 },
    10: { failed: 70, trained: 400, expert: 500, master: 600, legendary: 600 },
    11: { failed: 80, trained: 500, expert: 600, master: 800, legendary: 800 },
    12: { failed: 90, trained: 600, expert: 800, master: 1000, legendary: 1000 },
    13: { failed: 100, trained: 700, expert: 1000, master: 1500, legendary: 1500 },
    14: { failed: 150, trained: 800, expert: 1500, master: 2000, legendary: 2000 },
    15: { failed: 200, trained: 1000, expert: 2000, master: 2800, legendary: 2800 },
    16: { failed: 250, trained: 1300, expert: 2500, master: 3600, legendary: 4000 },
    17: { failed: 300, trained: 1500, expert: 3000, master: 4500, legendary: 5500 },
    18: { failed: 400, trained: 2000, expert: 4500, master: 7000, legendary: 9000 },
    19: { failed: 600, trained: 3000, expert: 6000, master: 10000, legendary: 13000 },
    20: { failed: 800, trained: 4000, expert: 7500, master: 15000, legendary: 20000 }
  };

  const occupationBonuses = {
    "Corporate Intern": { 1: 0, 2: 10, 3: 25, 4: 50, 5: 60, 6: 70, 7: 80 },
    "LCPD Recruit": { 1: 0, 2: 15, 3: 30, 4: 35, 5: 40, 6: 55, 7: 60 },
    "Medical Field - Entry Level": { 1: 0, 2: 20, 3: 30, 4: 35, 5: 40, 6: 55, 7: 65 },
    "Jobber/Merc": { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 70 },
    "Press/Media - Entry Level": { 1: 0, 2: 10, 3: 20, 4: 25, 5: 30, 6: 35, 7: 40 },
    "Day Job - Entry Level": { 1: 0, 2: 10, 3: 20, 4: 25, 5: 30, 6: 35, 7: 40 },
    "Part-Time Job": { 1: 0, 2: 5, 3: 10, 4: 15, 5: 20, 6: 25, 7: 30 },
    "Student - University": { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    "Gang Member - Initiate": { 1: 0, 2: 5, 3: 10, 4: 20, 5: 25, 6: 30, 7: 40 }
  };

  function getBonus(occupation, days) {
    return occupationBonuses[occupation][days] || 0;
  }

  new Dialog({
    title: "Earn Income",
    content: `
      <form>
        <div class="form-group">
          <label for="occupation">Occupation:</label>
          <select id="occupation" name="occupation">
            ${Object.keys(occupations).map(occ => `<option value="${occ}">${occ}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="skill">Skill:</label>
          <select id="skill" name="skill"></select>
        </div>
        <div class="form-group">
          <label for="taskLevel">Task Level (0-20):</label>
          <select id="taskLevel" name="taskLevel">
            ${Array.from({length: 21}, (_, i) => `<option value="${i}">${i}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="days">Days (1-7):</label>
          <input type="number" id="days" name="days" min="1" max="7" value="1">
        </div>
      </form>
    `,
    buttons: {
      roll: {
        label: "Roll",
        callback: async (html) => {
          const occupation = html.find('#occupation').val();
          const skillKey = html.find('#skill').val();
          const taskLevel = parseInt(html.find('#taskLevel').val());
          const days = Math.min(Math.max(parseInt(html.find('#days').val()), 1), 7);

          const skill = actor.system.skills[skillKey];
          if (!skill) {
            ui.notifications.error(`Skill ${skillKey} is not available for this actor.`);
            return;
          }

          const modifier = skill.totalModifier;
          const roll = new Roll("d20 + @mod", { mod: modifier });
          const rollResult = await roll.roll();

          const dc = dcByLevel[taskLevel];
          let degreeOfSuccess;
          if (rollResult.total >= dc + 10) degreeOfSuccess = 3;
          else if (rollResult.total >= dc) degreeOfSuccess = 2;
          else if (rollResult.total <= dc - 10) degreeOfSuccess = 0;
          else degreeOfSuccess = 1;

          const rank = skill.rank || 0;
          const proficiencyLabels = ["untrained", "trained", "expert", "master", "legendary"];
          const proficiency = proficiencyLabels[rank];

          let earningsPerDayCp = 0;
          switch (degreeOfSuccess) {
            case 0: earningsPerDayCp = 0; break;
            case 1: earningsPerDayCp = earnIncomeTable[taskLevel].failed; break;
            case 2: earningsPerDayCp = earnIncomeTable[taskLevel][proficiency]; break;
            case 3: earningsPerDayCp = 2 * earnIncomeTable[taskLevel][proficiency]; break;
          }

          const totalEarningsGp = (earningsPerDayCp * days) / 100;
          const bonusGp = getBonus(occupation, days);
          const totalGp = totalEarningsGp + bonusGp;

          const gp = Math.floor(totalGp);
          const sp = Math.round((totalGp - gp) * 10);

          const message = `
            <h3>Earn Income Result</h3>
            <p><strong>Occupation:</strong> ${occupation}</p>
            <p><strong>Skill:</strong> ${Object.keys(standardSkills).find(key => standardSkills[key] === skillKey)}</p>
            <p><strong>Proficiency:</strong> ${proficiency.charAt(0).toUpperCase() + proficiency.slice(1)}</p>
            <p><strong>Task Level:</strong> ${taskLevel}</p>
            <p><strong>Days Worked:</strong> ${days}</p>
            <p><strong>Roll Result:</strong> ${rollResult.total} vs DC ${dc} (${["Critical Failure", "Failure", "Success", "Critical Success"][degreeOfSuccess]})</p>
            <p><strong>Earnings from Skill:</strong> ${totalEarningsGp.toFixed(2)} Chrones</p>
            <p><strong>Bonus from Occupation:</strong> ${bonusGp} Chrones</p>
            <p><strong>Total Earnings:</strong> ${gp} Chrones ${sp} Shells</p>
            <button class="add-to-sheet" data-actor-id="${actor.id}" data-gp="${gp}" data-sp="${sp}">Add to Sheet</button>
          `;

          await ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) });

          $(document).on("click", `.add-to-sheet[data-actor-id="${actor.id}"]`, async function() {
            const button = $(this);
            const actorId = button.data("actor-id");
            const gpToAdd = parseInt(button.data("gp"));
            const spToAdd = parseInt(button.data("sp"));

            const targetActor = game.actors.get(actorId);
            if (!targetActor) {
              ui.notifications.error("Actor not found.");
              return;
            }

            if (!targetActor.testUserPermission(game.user, "OWNER")) {
              ui.notifications.warn("You do not have permission to modify this actor's sheet.");
              return;
            }

            const currencyItems = getCurrencyItems(targetActor);
            const gpItem = currencyItems.gp;
            const spItem = currencyItems.sp;

            if (!gpItem && gpToAdd > 0) {
              ui.notifications.warn("No 'Gold Pieces' item found on the actor's sheet to add Chrones.");
              return;
            }
            if (!spItem && spToAdd > 0) {
              ui.notifications.warn("No 'Silver Pieces' item found on the actor's sheet to add Shells.");
              return;
            }

            if (gpItem && gpToAdd > 0) {
              const currentGp = gpItem.system.quantity || 0;
              const newGp = currentGp + gpToAdd;
              await gpItem.update({ "system.quantity": newGp });
            }
            if (spItem && spToAdd > 0) {
              const currentSp = spItem.system.quantity || 0;
              const newSp = currentSp + spToAdd;
              await spItem.update({ "system.quantity": newSp });
            }

            ui.notifications.info(`Added ${gpToAdd} Chrones and ${spToAdd} Shells to ${targetActor.name}'s sheet.`);
            button.prop("disabled", true).text("Added to Sheet");
          });
        }
      }
    },
    render: (html) => {
      const occupationSelect = html.find('#occupation');
      const skillSelect = html.find('#skill');
      occupationSelect.on('change', () => {
        const occ = occupationSelect.val();
        const allowedSkillNames = occupations[occ];
        const allowedSkillKeys = allowedSkillNames.map(name => standardSkills[name]);

        let actorSkillKeys;
        if (actor.type === "character") {
          actorSkillKeys = Object.values(standardSkills);
        } else if (actor.type === "npc") {
          actorSkillKeys = Object.keys(actor.system.skills || {});
        } else {
          ui.notifications.warn("Unsupported actor type.");
          return;
        }

        const availableSkillKeys = allowedSkillKeys.filter(key => actorSkillKeys.includes(key));

        skillSelect.empty();
        if (availableSkillKeys.length === 0) {
          ui.notifications.warn(`No available skills for ${occ} with this actor.`);
          skillSelect.append('<option value="">No skills available</option>');
        } else {
          availableSkillKeys.forEach(key => {
            const skillName = Object.keys(standardSkills).find(name => standardSkills[name] === key);
            skillSelect.append(`<option value="${key}">${skillName}</option>`);
          });
        }
      });
      occupationSelect.trigger('change');
    }
  }).render(true);
}

// Earn Income Entertainer Macro
async function earnIncomeEntertainer() {
  const incomeTable = {
    1: { dc: 15, failed: 2, trained: 20, expert: 20, master: 20, legendary: 20 },
    2: { dc: 16, failed: 4, trained: 30, expert: 30, master: 30, legendary: 30 },
    3: { dc: 18, failed: 8, trained: 50, expert: 50, master: 50, legendary: 50 },
    4: { dc: 19, failed: 10, trained: 70, expert: 80, master: 80, legendary: 80 },
    5: { dc: 20, failed: 20, trained: 90, expert: 100, master: 100, legendary: 100 },
    6: { dc: 22, failed: 30, trained: 150, expert: 200, master: 200, legendary: 200 },
    7: { dc: 23, failed: 40, trained: 200, expert: 250, master: 250, legendary: 250 },
    8: { dc: 24, failed: 50, trained: 250, expert: 300, master: 300, legendary: 300 },
    9: { dc: 26, failed: 60, trained: 300, expert: 400, master: 400, legendary: 400 },
    10: { dc: 27, failed: 70, trained: 400, expert: 500, master: 600, legendary: 600 },
    11: { dc: 28, failed: 80, trained: 500, expert: 600, master: 800, legendary: 800 },
    12: { dc: 30, failed: 90, trained: 600, expert: 800, master: 1000, legendary: 1000 },
    13: { dc: 31, failed: 100, trained: 700, expert: 1000, master: 1500, legendary: 1500 },
    14: { dc: 32, failed: 150, trained: 800, expert: 1500, master: 2000, legendary: 2000 },
    15: { dc: 34, failed: 200, trained: 1000, expert: 2000, master: 2800, legendary: 2800 },
    16: { dc: 35, failed: 250, trained: 1300, expert: 2500, master: 3600, legendary: 4000 },
    17: { dc: 36, failed: 300, trained: 1500, expert: 3000, master: 4500, legendary: 5500 },
    18: { dc: 38, failed: 400, trained: 2000, expert: 4500, master: 7000, legendary: 9000 },
    19: { dc: 39, failed: 600, trained: 3000, expert: 6000, master: 10000, legendary: 13000 },
    20: { dc: 40, failed: 800, trained: 4000, expert: 7500, master: 15000, legendary: 20000 }
  };

  const fanTable = {
    1: { low: 1, high: 2, fanClubLevel: 0 },
    2: { low: 3, high: 4, fanClubLevel: 0 },
    3: { low: 5, high: 6, fanClubLevel: 0 },
    4: { low: 7, high: 9, fanClubLevel: 0 },
    5: { low: 10, high: 13, fanClubLevel: 0 },
    6: { low: 14, high: 18, fanClubLevel: 0 },
    7: { low: 19, high: 27, fanClubLevel: 0 },
    8: { low: 28, high: 36, fanClubLevel: 0 },
    9: { low: 37, high: 53, fanClubLevel: 0 },
    10: { low: 54, high: 75, fanClubLevel: 1 },
    11: { low: 76, high: 99, fanClubLevel: 1 },
    12: { low: 100, high: 150, fanClubLevel: 1 },
    13: { low: 151, high: 215, fanClubLevel: 2 },
    14: { low: 216, high: 300, fanClubLevel: 2 },
    15: { low: 301, high: 425, fanClubLevel: 2 },
    16: { low: 426, high: 600, fanClubLevel: 3 },
    17: { low: 601, high: 850, fanClubLevel: 3 },
    18: { low: 851, high: 1200, fanClubLevel: 3 },
    19: { low: 1201, high: 1700, fanClubLevel: 4 },
    20: { low: 1701, high: 2400, fanClubLevel: 5 }
  };

  function formatCurrency(cp) {
    const gp = Math.floor(cp / 100);
    const remainder = cp % 100;
    const sp = Math.floor(remainder / 10);
    const cpLeft = remainder % 10;
    let result = [];
    if (gp > 0) result.push(`${gp} Chrones`);
    if (sp > 0) result.push(`${sp} Shells`);
    if (cpLeft > 0) result.push(`${cpLeft} Bones`);
    if (result.length === 0) return "0 Bones";
    return result.join(", ");
  }

  const content = `
    <form>
      <div class="form-group">
        <label for="taskLevel">Task Level:</label>
        <select id="taskLevel">
          ${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="skill">Skill:</label>
        <select id="skill">
          <option value="Performance">Performance</option>
          <option value="Diplomacy">Diplomacy</option>
          <option value="Deception">Deception</option>
        </select>
      </div>
    </form>
  `;

  new Dialog({
    title: "Aspiring Entertainer Earn Income",
    content: content,
    buttons: {
      roll: {
        label: "Roll for Income",
        callback: async (html) => {
          const taskLevel = parseInt(html.find("#taskLevel").val());
          const skill = html.find("#skill").val();

          const skillKeys = {
            "Performance": "performance",
            "Diplomacy": "diplomacy",
            "Deception": "deception"
          };

          const skillKey = skillKeys[skill];
          if (!skillKey) {
            ui.notifications.warn(`Invalid skill selected: ${skill}`);
            return;
          }

          const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
          if (!actor) {
            ui.notifications.warn("Please select a token or assign a character to your user!");
            return;
          }
          if (actor.type !== "character" && actor.type !== "npc") {
            ui.notifications.warn("This macro is designed for characters or NPCs only.");
            return;
          }
          if (game.system.id !== "pf2e") {
            ui.notifications.warn("This macro is designed for the Pathfinder 2e system.");
            return;
          }

          const skillData = actor.system.skills[skillKey];
          if (!skillData) {
            ui.notifications.warn(`The skill ${skill} is not available for this actor.`);
            return;
          }

          const rank = skillData.rank;
          if (rank === 0) {
            ui.notifications.warn(`You must be trained in ${skill} to perform this task.`);
            return;
          }

          const proficiencyLevels = ["Untrained", "Trained", "Expert", "Master", "Legendary"];
          const proficiency = proficiencyLevels[rank];
          const dc = incomeTable[taskLevel].dc;

          let rollTotal;
          if (typeof actor.rollSkill === "function") {
            const roll = await actor.rollSkill(skillKey);
            rollTotal = roll.total;
          } else {
            const skillValue = skillData.value;
            const roll = new Roll("1d20 + @skill", { skill: skillValue });
            await roll.evaluate({ async: true });
            rollTotal = roll.total;
            roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor: actor }),
              flavor: `Rolling ${skill} (DC ${dc})`
            });
          }

          let degree;
          if (rollTotal >= dc + 10) degree = "Critical Success";
          else if (rollTotal >= dc) degree = "Success";
          else if (rollTotal <= dc - 10) degree = "Critical Failure";
          else degree = "Failure";

          const proficiencyKey = { 1: "trained", 2: "expert", 3: "master", 4: "legendary" };
          const baseIncome = incomeTable[taskLevel][proficiencyKey[rank]];
          const multipliers = {
            "Critical Success": 2,
            "Success": 1,
            "Failure": 0.5,
            "Critical Failure": 0
          };
          const multiplier = multipliers[degree];
          const income = Math.floor(baseIncome * multiplier);

          const fansLow = fanTable[taskLevel].low;
          const fansHigh = fanTable[taskLevel].high;
          const fanAttendance = Math.floor(Math.random() * (fansHigh - fansLow + 1)) + fansLow;
          const payingFans = Math.floor(fanAttendance / 2);
          const totalEarnings = payingFans * income;

          const gp = Math.floor(totalEarnings / 100);
          const remainder = totalEarnings % 100;
          const sp = Math.floor(remainder / 10);
          const cp = remainder % 10;

          const formattedEarnings = formatCurrency(totalEarnings);
          const chatContent = `
            <p><strong>Task Level:</strong> ${taskLevel}</p>
            <p><strong>Skill:</strong> ${skill}</p>
            <p><strong>Skill Proficiency:</strong> ${proficiency}</p>
            <p><strong>Roll Result:</strong> ${rollTotal} vs ${dc} - ${degree}</p>
            <p><strong>Fan Attendance:</strong> ${fanAttendance}</p>
            <p><strong>Total Earnings:</strong> ${formattedEarnings}</p>
            <button class="add-to-sheet" data-actor-id="${actor.id}" data-gp="${gp}" data-sp="${sp}" data-cp="${cp}">Add to Sheet</button>
          `;

          ChatMessage.create({ content: chatContent });

          $(document).on("click", `.add-to-sheet[data-actor-id="${actor.id}"]`, async function() {
            const button = $(this);
            const actorId = button.data("actor-id");
            const gpToAdd = parseInt(button.data("gp"));
            const spToAdd = parseInt(button.data("sp"));
            const cpToAdd = parseInt(button.data("cp"));

            const targetActor = game.actors.get(actorId);
            if (!targetActor) {
              ui.notifications.error("Actor not found.");
              return;
            }

            if (!targetActor.testUserPermission(game.user, "OWNER")) {
              ui.notifications.warn("You do not have permission to modify this actor's sheet.");
              return;
            }

            const currencyItems = getCurrencyItems(targetActor);
            const gpItem = currencyItems.gp;
            const spItem = currencyItems.sp;
            const cpItem = currencyItems.cp;

            if (!gpItem && gpToAdd > 0) {
              ui.notifications.warn("No 'Gold Pieces' item found on the actor's sheet to add Chrones.");
              return;
            }
            if (!spItem && spToAdd > 0) {
              ui.notifications.warn("No 'Silver Pieces' item found on the actor's sheet to add Shells.");
              return;
            }
            if (!cpItem && cpToAdd > 0) {
              ui.notifications.warn("No 'Copper Pieces' item found on the actor's sheet to add Bones.");
              return;
            }

            if (gpItem && gpToAdd > 0) {
              const currentGp = gpItem.system.quantity || 0;
              await gpItem.update({ "system.quantity": currentGp + gpToAdd });
            }
            if (spItem && spToAdd > 0) {
              const currentSp = spItem.system.quantity || 0;
              await spItem.update({ "system.quantity": currentSp + spToAdd });
            }
            if (cpItem && cpToAdd > 0) {
              const currentCp = cpItem.system.quantity || 0;
              await cpItem.update({ "system.quantity": currentCp + cpToAdd });
            }

            ui.notifications.info(`Added ${gpToAdd} Chrones, ${spToAdd} Shells, and ${cpToAdd} Bones to ${targetActor.name}'s sheet.`);
            button.prop("disabled", true).text("Added to Sheet");
          });
        }
      }
    },
    default: "roll"
  }).render(true);
}

// Pay Bills Macro
async function payBills() {
  async function getAllItemNamesInFolders(folderNames) {
    let allNames = [];
    for (const folderName of folderNames) {
      console.log(`Finding folder '${folderName}'`);
      const folder = game.folders.find(f => f.name === folderName && f.type === "Item");
      if (!folder) {
        console.log(`Folder '${folderName}' not found.`);
        continue;
      }
      console.log(`Folder '${folderName}' found: ${folder.name} ID: ${folder.id}`);
      const names = game.items.filter(item => item.folder?.id === folder.id && item.type === "treasure").map(item => item.name);
      console.log(`Found ${names.length} treasure items in folder ${folder.name}:`, names);
      allNames = allNames.concat(names);
    }
    return allNames;
  }

  function parsePrice(coins) {
    if (coins && typeof coins === 'object' && coins.gp !== undefined) {
      const pp = coins.pp || 0;
      const gp = coins.gp || 0;
      const sp = coins.sp || 0;
      const cp = coins.cp || 0;
      return (pp * 10) + gp + (sp * 0.1) + (cp * 0.01);
    } else if (typeof coins === 'string') {
      const match = coins.match(/(\d+(\.\d+)?)\s*(cp|sp|gp|pp)/i);
      if (!match) return 0;
      const amount = parseFloat(match[1]);
      const unit = match[3].toLowerCase();
      switch (unit) {
        case 'cp': return amount * 0.01;
        case 'sp': return amount * 0.1;
        case 'gp': return amount;
        case 'pp': return amount * 10;
        default: return 0;
      }
    } else if (typeof coins === 'number') {
      return coins;
    } else {
      return 0;
    }
  }

  async function rollOnDebtTable() {
    const tableUuid = "RollTable.2auG89miBQmkYqpF";
    const table = await fromUuid(tableUuid);
    if (table) {
      await table.draw();
    } else {
      ui.notifications.error("Roll table 'Didn't Pay Bills' not found.");
    }
  }

  async function getOrCreateDebtItem(actor) {
    let debtItem = actor.items.find(item => item.name === "Personal Debt" && item.type === "equipment");
    if (!debtItem) {
      const itemData = {
        name: "Personal Debt",
        type: "equipment",
        system: {
          description: {
            value: "Tracks personal debt in gp."
          },
          quantity: 0,
          weight: 0,
          price: { value: { gp: 0 } }
        }
      };
      debtItem = await Item.create(itemData, { parent: actor });
    }
    return debtItem;
  }

  const folderNames = ["Billable Items", "HERO", "Rent Housing"];
  const allItemNames = await getAllItemNamesInFolders(folderNames);
  console.log("All Item Names:", allItemNames);

  const actor = game.user.character;
  if (!actor) {
    console.log("No character assigned to this user.");
    ui.notifications.warn("No character assigned to this user.");
    return;
  }
  if (actor.type !== "character") {
    console.log("This macro is for player characters only.");
    ui.notifications.warn("This macro is for player characters only.");
    return;
  }
  console.log("Actor items:", actor.items.map(item => ({name: item.name, type: item.type})));

  const billItems = actor.items.filter(item => item.type === "treasure" && allItemNames.includes(item.name));
  console.log("Bill Items:", billItems.map(item => ({name: item.name, price: item.system.price?.value})));

  if (billItems.length === 0) {
    console.log("No bills to pay.");
    ui.notifications.info("No bills to pay.");
    return;
  }

  const prices = billItems.map(item => parsePrice(item.system.price?.value));
  console.log("Prices:", prices);
  const total = prices.reduce((a, b) => a + b, 0);
  console.log("Total:", total);

  let content = "<table><tr><th>Item</th><th>Price (GP)</th></tr>";
  for (let i = 0; i < billItems.length; i++) {
    content += `<tr><td>${billItems[i].name}</td><td>${prices[i].toFixed(2)}</td></tr>`;
  }
  content += `<tr><td><strong>Total</strong></td><td><strong>${total.toFixed(2)}</strong></td></tr></table>`;

  async function payBillsAction() {
    console.log("Paying bills...");
    const totalCP = total * 100;
    console.log("Total CP to pay:", totalCP);
    const charTotalCP = getTotalCP(actor);
    console.log("Character total CP:", charTotalCP);
    if (charTotalCP >= totalCP) {
      const newTotalCP = charTotalCP - totalCP;
      await setCurrency(actor, newTotalCP);
      ChatMessage.create({content: `${actor.name} has paid their bill for a total of ${total.toFixed(2)} GP.`});
    } else {
      const currencyItems = getCurrencyItems(actor);
      for (let key in currencyItems) {
        if (currencyItems[key]) {
          await currencyItems[key].update({"system.quantity": 0});
        }
      }
      const debtCP = totalCP - charTotalCP;
      const debtGP = debtCP / 100;
      const debtItem = await getOrCreateDebtItem(actor);
      const currentDebt = debtItem.system.quantity || 0;
      const newDebt = currentDebt + debtGP;
      await debtItem.update({ "system.quantity": newDebt });
      ChatMessage.create({content: `${actor.name} has paid what they could! They are in debt ${debtGP.toFixed(2)} GP.`});
      await rollOnDebtTable();
    }
  }

  async function riskIt() {
    const debtItem = await getOrCreateDebtItem(actor);
    const currentDebt = debtItem.system.quantity || 0;
    const newDebt = currentDebt + total;
    await debtItem.update({ "system.quantity": newDebt });
    ChatMessage.create({content: `${actor.name} has not paid their bills! They are in debt for ${total.toFixed(2)} GP.`});
    await rollOnDebtTable();
  }

  new Dialog({
    title: "Pay Your Bills",
    content: content,
    buttons: {
      pay: {
        label: "Pay Bills",
        callback: payBillsAction
      },
      risk: {
        label: "Risk It - Don't Pay Bills",
        callback: riskIt
      }
    }
  }).render(true);
}

// Pay Debt Macro
async function payDebt() {
  async function getOrCreateDebtItem(actor) {
    let debtItem = actor.items.find(item => item.name === "Personal Debt" && item.type === "equipment");
    if (!debtItem) {
      const folder = game.folders.find(f => f.name === "Debt Tracking" && f.type === "Item");
      if (folder) {
        const debtItemInFolder = game.items.find(item => item.name === "Personal Debt" && item.folder?.id === folder.id);
        if (debtItemInFolder) {
          debtItem = await actor.createEmbeddedDocuments("Item", [debtItemInFolder.toObject()]);
          debtItem = debtItem[0];
        }
      }
      if (!debtItem) {
        const itemData = {
          name: "Personal Debt",
          type: "equipment",
          system: {
            description: {
              value: "Tracks personal debt in gp."
            },
            quantity: 0,
            weight: 0,
            price: { value: { gp: 0 } }
          }
        };
        debtItem = await Item.create(itemData, { parent: actor });
      }
    }
    return debtItem;
  }

  const actor = game.user.character;
  if (!actor) {
    ui.notifications.warn("No character assigned to this user.");
    return;
  }
  if (actor.type !== "character") {
    ui.notifications.warn("This macro is for player characters only.");
    return;
  }

  const debtItem = await getOrCreateDebtItem(actor);
  if (!debtItem) {
    ui.notifications.error("Failed to retrieve or create the Personal Debt item.");
    return;
  }

  const currentDebt = debtItem.system.quantity || 0;
  if (currentDebt <= 0) {
    ui.notifications.info("You have no debt to pay.");
    return;
  }

  const totalCP = getTotalCP(actor);
  const totalGP = totalCP / 100;
  const debtContent = `
    <p><strong>Current Debt:</strong> ${currentDebt.toFixed(2)} gp</p>
    <p><strong>Your Total Currency:</strong> ${totalGP.toFixed(2)} gp</p>
    <div class="form-group">
      <label for="payment">Amount to Pay (gp):</label>
      <input type="number" id="payment" name="payment" min="0" step="0.01" value="0">
    </div>
  `;

  new Dialog({
    title: "Pay Debt",
    content: debtContent,
    buttons: {
      pay: {
        label: "Pay Debt",
        callback: async (html) => {
          const paymentGP = parseFloat(html.find('#payment').val());
          if (isNaN(paymentGP) || paymentGP <= 0) {
            ui.notifications.warn("Please enter a valid payment amount.");
            return;
          }
          if (paymentGP > currentDebt) {
            ui.notifications.warn("Payment cannot exceed current debt.");
            return;
          }
          const paymentCP = paymentGP * 100;
          if (paymentCP > totalCP) {
            ui.notifications.warn("You do not have enough currency to make this payment.");
            return;
          }
          const newTotalCP = totalCP - paymentCP;
          await setCurrency(actor, newTotalCP);
          const newDebt = currentDebt - paymentGP;
          await debtItem.update({ "system.quantity": newDebt });
          
          const chatMessage = `
            <p><b>Character Name:</b> ${actor.name}</p>
            <p><b>Original Debt:</b> ${currentDebt.toFixed(2)} Chrones</p>
            <p><b>Amount Paid:</b> ${paymentGP.toFixed(2)} Chrones</p>
            <p><b>New Debt Total:</b> ${newDebt.toFixed(2)} Chrones</p>
          `;
          ChatMessage.create({ content: chatMessage });

          ui.notifications.info(`Paid ${paymentGP.toFixed(2)} gp towards debt. New debt: ${newDebt.toFixed(2)} gp.`);
        }
      }
    }
  }).render(true);
}

// Central dialog function
async function showCivilServicesDialog() {
  const services = {
    "I need to Earn Income": earnIncome,
    "I am a Entertainer and need to Earn Income": earnIncomeEntertainer,
    "I need to Pay My Bills": payBills,
    "I need to Pay My Debts": payDebt
  };

  new Dialog({
    title: "Lumina City Civil Services",
	content: `
    <div style="text-align: center; margin-bottom: 10px;">
      <img src="modules/lumina-city-civil-services/images/lccs_logo.png" width="256" height="256" alt="LCCS Logo">
    </div>
    <h1 style="text-align: center;">Welcome to Lumina City Civil Services!</h1>
    <h3 style="text-align: center;">What may we help you with today?</h3>
    <div class="form-group">
      <label for="service">Available Services:</label>
      <select id="service">
        ${Object.keys(services).map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>
  `,
  buttons: {
    request: {
      label: "Request Services",
      callback: async (html) => {
        const selectedService = html.find('#service').val();
        const serviceFunction = services[selectedService];
        if (serviceFunction) {
          await serviceFunction();
        } else {
          ui.notifications.warn("Invalid service selected.");
        }
      }
    }
  },
  width: 550,
  height: 650
}).render(true);
}

// Hook to create the central macro
Hooks.on('ready', () => {
  if (!game.macros.getName('Civil Services')) {
    Macro.create({
      name: 'Civil Services',
      type: 'script',
      command: 'showCivilServicesDialog();'
    });
  }
});