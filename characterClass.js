(function() {

    const statMap = {
        "Strength" : 0,
        "Dexterity" : 1,
        "Constitution" : 2,
        "Intelligence" : 3,
        "Wisdom" : 4,
        "Luck" : 5
    };

    function Stat(name, maxRange) {
        this.name = name;
        this.point = getRandomInt(5, maxRange);
        this.increase = function() {
            this.point += 1;
        };
    }
    Stat.prototype.toString = function statToString() {
        return ("The " + this.name + " stat. Current value is: " + this.point + ".");
    };

    function Inventory(maxSize) {
        this.items = [];
        this.maxSize = maxSize;
        this.addItem = function(item) {
            if (this.items.length < this.maxSize) {
                this.items.push(item);
            } else { 
                throw {name : "InventoryError", message : "You're inventory is full, you cannot add this item to your inventory."};
            }
        };
        this.removeItem = function(itemName) {
            if (this.items.length > 0) {
                let index = -1;
                for (let i = 0; i < this.items.length; i++) {
                    if (this.items[i].name == itemName) {
                        index = i;
                    }
                }
                if (index != -1) {
                    this.items.splice(index, 1);
                } else {
                    throw {name : "InventoryError", message : "That item isn't in your inventory."};
                }
            } else {
                throw {name : "InventoryError", message : "Your inventory is empty."};
            }
        };
    }
    Inventory.prototype.toString = function inventoryToString() {
        return ("An inventory with a maximum size of " + this.maxSize + " slots. Currently " + this.items.length + " have been used.");
    };

    function Character(name) {
        console.log("Starting to create character!");
        this.name = name;
        this.race = "Human";
        this.level = 1;
        this.exp = 0;
        this.statPoints = 0;
        this.class = "Adventurer";
        this.professions = [];
        this.inventory = new Inventory(20);
        this.stats = [  new Stat("Strength", 50),
                        new Stat("Dexterity", 50),
                        new Stat("Constitution", 50),
                        new Stat("Intelligence", 50),
                        new Stat("Wisdom", 50),
                        new Stat("Luck", 100)
        ];
        this.totalHealth = Math.floor(this.stats[statMap.Constitution].point / 10) * 100;
        this.currHealth = this.totalHealth;
        this.gold = this.stats[5].point * 5;
        //console.log("All basic stats were created without issue!");

        this.calcTNL = function() {
            const totalLevels = 100;
            const xpForFirst = 50;
            const xpForLast = 15000;
            const B = Math.log(1.0 * xpForLast / xpForFirst) / (totalLevels - 1);
            const A = 1.0 * xpForFirst / (Math.exp(B) - 1.0);
            function xpForLevel(lev, A, B) {
                const x = Number(A * Math.exp(B * lev));
                const y = 10 ** Number(Math.log(x) / Math.log(10) - 2.2);
                return Number(x / y) * y;
            }
            
            this.tnl = xpForLevel(this.level) - xpForLevel(this.level - 1);
        };
        this.tnl = this.calcTNL();
        //console.log("Created TNL without issue!");

        this.changeClass = function(newClass) {
            this.class = newClass;
        };

        this.levelUp = function() {
            this.level += 1;
            this.statPoints += 5;
            this.calcTNL();
        };

        this.gainEXP = function(amt) {
            this.exp += amt + Math.floor(this.stats[statMap.Wisdom].point / 5);
            if (this.exp >= this.tnl) {
                this.exp = this.exp - this.tnl;
                this.levelUp();
            }
        };

        this.updateCharacter = function() {
            this.totalHealth = Math.floor(this.stats[statMap.Constitution].point / 10) * 100;
            this.currHealth = this.totalHealth;
        };

        this.addProfession = function(prof) {
            this.professions.push(prof);
        };
        //console.log("Character created without issue!");
    }
    Character.prototype.toString = function characterToString() {
        return ("A " + this.race + " by the name of " + this.name + ". Currently level " + this.level + ", and has the class of " + this.class + ".");
    };

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let exports = module.exports = Character;
})();