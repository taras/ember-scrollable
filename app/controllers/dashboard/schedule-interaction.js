import Ember from 'ember';
import EmberValidations from 'ember-validations';
import ModelsNavigationMixin from 'phoenix/mixins/models-navigation';
import TimeZoneOption from 'phoenix/models/as-calendar/time-zone-option';
import Occurrence from 'phoenix/models/as-calendar/occurrence';
import PromiseController from 'phoenix/controllers/promise';
import { request } from 'ic-ajax';

var InteractionOccurrence = Occurrence.extend({
  interaction: null,
  duration: moment.duration(60, 'minute'),
  scheduledCallTime: Ember.computed.alias('interaction.scheduledCallTime'),
  title: 'Scheduled Call',

  time: function(key, value) {
    if (arguments.length > 1) {
      if (value != null) {
        this.set('scheduledCallTime', value.toDate());
      } else {
        this.set('scheduledCallTime', null);
      }
    }

    var scheduledCallTime = this.get('scheduledCallTime');

    if (scheduledCallTime != null) {
      return moment(this.get('scheduledCallTime'));
    } else {
      return null;
    }
  }.property('scheduledCallTime')
});

var UnavailabilityOccurrence = Occurrence.extend({
  unavailability: null,
  title: 'AlphaCall',
  type: 'alpha-call',

  time: function() {
    return moment(this.get('unavailability.startsAt'));
  }.property('unavailability.startsAt'),

  endingTime: function() {
    return moment(this.get('unavailability.endsAt'));
  }.property('unavailability.endsAt'),

  duration: function() {
    return moment.duration(this.get('unavailability.endingTime').diff(this.get('unavailability.time')));
  }.property('unavailability.startsAt', 'unavailability.endsAt')
});

export default Ember.ObjectController.extend(ModelsNavigationMixin, EmberValidations.Mixin, {
  needs: ['dashboard'],
  dashboard: Ember.computed.oneWay('controllers.dashboard'),

  navigableModels: Ember.computed.oneWay('dashboard.interactionsToSchedule'),
  modelRouteParams: ['dashboard.schedule-interaction'],
  requestPromise: null,

  visibleUnavailabilities: function() {
    return this.get('unavailabilities').filter((unavailability) => {
      return unavailability.get('advisorId') === this.get('advisorId') &&
             unavailability.get('projectId') === this.get('projectId') &&
             unavailability.get('startsAt') === this.get('scheduledCallTime');
    });
  }.property('unavailabilities.@each.{advisorId,projectId,startsAt}', 'advisorId', 'projectId', 'scheduledCallTime'),

  unavailabilityOccurrences: function() {
    return this.get('visibleUnavailabilities').map(function(unavailability) {
      return UnavailabilityOccurrence.create({ unavailability: unavailability });
    });
  }.property('visibleUnavailabilities.[]'),

  occurrence: function() {
    return InteractionOccurrence.create({ interaction: this });
  }.property(),

  timeZoneOptions: function() {
    var timeZoneOptions = [];
    var advisorTimeZone = this.get('advisor.timeZone');
    var clientTimeZone = this.get('clientContact.timeZone');

    if (advisorTimeZone != null) {
      timeZoneOptions.push(TimeZoneOption.create({
        value: advisorTimeZone,
        title: 'Advisor Time Zone'
      }));
    }

    if (clientTimeZone != null) {
      timeZoneOptions.push(TimeZoneOption.create({
        value: clientTimeZone,
        title: 'Client Time Zone'
      }));
    }

    return timeZoneOptions;
  }.property('advisor.timeZone', 'clientContact.timeZone'),

  actions: {
    hideSidePanel: function() {
      this.transitionToRoute('dashboard');
    },

    cancel: function() {
      var requestPromise = PromiseController.create({
        promise: request({
          url: `${EmberENV.apiBaseUrl}/interests/${this.get('model.id')}`,
          type: 'DELETE'
        }).then(response => {
          this.store.pushPayload(response);

          new Messenger().post({
            message: "The interaction has been cancelled.",
            type: 'success',
            showCloseButton: true
          });

          this.get('sidePanel').send('close');
        }, () => {
          new Messenger().post({
            message: "The interaction could not be cancelled.",
            type: 'error',
            showCloseButton: true
          });
        })
      });

      this.set('requestPromise', requestPromise);
    },

    submit: function() {
      var advisorName = this.get('advisor.name');
      var clientName = this.get('clientContact.name');

      this.get('model').setProperties({
        scheduledCallTime: this.get('scheduledCallTime'),
        interactionType: this.get('interactionType')
      }).save().then(function() {
        new Messenger().post({
          message: `An interaction between ${advisorName} and ${clientName} has been scheduled.`,
          type: 'success',
          showCloseButton: true
        });
      }, function() {
        new Messenger().post({
          message: `There has been an error scheduling the interaction.`,
          type: 'error',
          showCloseButton: true
        });
      });
    }
  },

  validations: {
    interactionType: {
      presence: true
    }
  },

  interactionTypesForSelect: function() {
    var classifications = this.get('interactionClassifications');
    var interactionTypes = this.get('interactionTypes');

    var types = _.map(classifications, function(typeIds, classification) {
      return _.map(typeIds, function(typeId) {
        return {
          id: typeId,
          name: interactionTypes[typeId],
          classification: _.map(classification.split('_'), function(word){
            return word.capitalize();
          }).join(' ')
        };
      });
    });

    return _.flatten(types);
  }.property('interactionTypes', 'interactionClassifications'),

  speakDialInCountries: [
    { id: 'HK', name: 'Hong Kong' },
    { id: 'US', name: 'United States' },
    { id: 'UK', name: 'United Kingdom' }
  ],

  yesNo: [
    { id: true, name: 'Yes'}, { id: false, name: 'No' }
  ]
});
