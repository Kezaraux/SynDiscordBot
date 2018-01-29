(function() {
    //use strict;
    let exports = module.exports = {};

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

    function Item(name, price, desc) {
        this.name = name;
        this.price = price;
        this.desc = desc;
    }
    Item.prototype.toString = function itemToString() {
        return ("This is a(n) " + this.name + ", which has a cost of: " + this.price + ". It can be described as: " + this.desc);
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
        console.log("All basic stats were created without issue!");

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
        console.log("Created TNL without issue!");

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
        console.log("Character created without issue!");
    }
    Character.prototype.toString = function characterToString() {
        return ("A " + this.race + " by the name of " + this.name + ". Currently level " + this.level + ", and has the class of " + this.class + ".");
    };

    function Workplace(name, desc, xpGain, pay, statToGrow, baseStatGain, workLength) {
        this.name = name;
        this.xpGain = xpGain;
        this.pay = pay;
        this.statToGrow = statToGrow;
        this.baseStatGain = baseStatGain;
        this.workLength = workLength; //IN SECONDS

        this.work = function(character) {
            character.stats[statMap[this.statToGrow]].point += this.baseStatGain;
            character.gold += this.pay;
            character.gainEXP(this.xpGain);
        };
    }
    Workplace.prototype.toString = function workplaceToString() {
        return (this.name + ", working here will help improve your " + this.statToGrow + ". Also, it has a base pay of " + this.pay + " gold. Working here will take about " + Math.floor(this.workLength/60) + " minutes.");
    };

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }





    /* START OF ALLLLLLL THE GAME DATA */
    exports.workplaceMap = {
        "Grocery Store" : 0,
        "Library" : 1
    };

    exports.workplaces = [
        new Workplace("Grocery Store", "Improve your strength by carrying boxes around!", 5, 5, "Strength", 1, 600),
        new Workplace("Library", "Volunteer at the library! Helps improve your knowledge!", 5, 0, "Intelligence", 1, 600)
    ];

    exports.itemList = [
        new Item("Beginner Potion", 10, "A beginner's health potion! Restores a small amount of health."),
        new Item("Tree Branch", 2, "A branch from a tree. Good to what things with, though it will break quickly.")
    ];

    exports.itemListMap = {
        "Beginner Potion" : 0,
        "Tree Branch" : 1
    };


})();