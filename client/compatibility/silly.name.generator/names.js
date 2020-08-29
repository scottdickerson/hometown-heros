getRandomName = function () {
    var firstName = ["Sofía", "Isabella", "Lucía", "Madison", "Ava", "Chloe", "Olivia", "Chloe", "Sophia", "Emma",
        "Isabella", "Sophia", "Mia", "Olivia", "Esther", "Rachel", "Ethan", "Noah", "Aiden", "Jayden", "Elijah", "Jeremiah",
        "Jayden", "Ethan", "Ryan", "Lucas", "Aiden", "Muhammad", "Daniel", "William", "Eric", "Jason", "Liam", "Joshua",
        "Liam", "Dylan", "Jacob", "Noah", "Jayden", "Ethan", "Matthew", "Sebastian", "Alexander", "Daniel", "Angel",
        "Joseph", "David", "Michael", "Moshe", "Jacob", "Benjamin", "Alexander", "Daniel", "Samuel", "Jack", "Carter", "Mason", "Amir"];

    var lastName = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson",
        "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez",
        "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green",
        "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell",
        "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell",
        "Murphy", "Bailey", "Rivera", "Cooper"];

    var firstNm = firstName[Math.floor((Math.random() * firstName.length))];
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (Math.random() < 0.1) {
        firstNm += " " + possible.charAt(Math.floor(Math.random() * possible.length));
        if (Math.random() < 0.5) {
            firstNm += ".";
        }
    }
    var lastNm = lastName[Math.floor((Math.random() * lastName.length))];

    return {
        first: firstNm,
        last: lastNm
    };
};
