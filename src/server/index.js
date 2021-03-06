'use strict';

const path = require('path');
const request = require('request');
const express = require('express');
const proj4 = require('proj4');

const app = express();
const truckCombiner = require('./truck_combiner.js');

app.use('/', express.static(path.join(__dirname, '../client')));

app.get('/api/trucks', function(req, res) {
    const API_URL = 'https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/food_trucks_schedule/FeatureServer/0/query?returnGeometry=false&where=1%3D1&outFields=*&f=json';
    request(API_URL, function(error, response, body) {
        if (error) {
            res.status(500);
            res.send('Third party API error');
            return;
        }
        const data = JSON.parse(body);

        // Trucks can have null points, so we must filter out those bad values.
        data.features = data.features.filter(function (feature) {
            return feature.attributes.POINT_X && feature.attributes.POINT_Y
        });

        const responseData = data.features.map(function(feature) {
            const coordinates = proj4('EPSG:3857', 'EPSG:4326', [feature.attributes.POINT_X, feature.attributes.POINT_Y]);
            return {
                day: feature.attributes.Day,
                title: feature.attributes.Truck,
                location: feature.attributes.Title,
                notes: feature.attributes.Notes,
                website: feature.attributes.Link || null,
                availability: feature.attributes.Hours,
                lat: coordinates[1],
                lng: coordinates[0]
            };
        });
        const combinedTrucks = truckCombiner.combineTrucks(responseData);
        res.json(combinedTrucks);
    });
});

app.listen(80, function() {
    console.log('Express server listening on port 80.');
});
