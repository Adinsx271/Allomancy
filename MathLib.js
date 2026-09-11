function getAngleFromPoints(x1, y1, x2, y2) {
    // Calculate the angle in radians using Math.atan2
    let angleRadians = Math.atan2(y2 - y1, x2 - x1);
    
    // Convert the angle to degrees
    let angleDegrees = angleRadians * (180 / Math.PI);
    
    // Ensure the angle is in the range [0, 360)
    if (angleDegrees < 0) {
        angleDegrees += 360;
    }

    if (x1 === x2 && y1 === y2) {
        return null;
    }

    return angleDegrees;
}

function getSmallestAngleDifference(firstAngle, secondAngle) {
    return Math.abs(((firstAngle - secondAngle + 180) % 360 + 360) % 360 - 180);
}

function degreesToRadians(angleDegrees) {
    return angleDegrees * (Math.PI / 180);
}

function findClosestAngleIndex(cursorAngle, angles, angleMargin = 10) {
    let closestIndex = null;
    let closestDifference = Infinity;
    for (let index = 0; index < angles.length; index++) {
        const difference = getSmallestAngleDifference(angles[index], cursorAngle);
        if (difference < closestDifference) {
            closestDifference = difference;
            closestIndex = index;
        }
    }
    return closestDifference <= angleMargin ? closestIndex : null;
}

if (typeof module !== "undefined") {
    module.exports = {
        degreesToRadians,
        findClosestAngleIndex,
        getAngleFromPoints,
        getSmallestAngleDifference,
    };
}
