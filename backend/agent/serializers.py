from rest_framework import serializers


class ChatMessageFeedbackSerializer(serializers.Serializer):
    """
    Serializer for validating chat message feedback.
    """
    message_id = serializers.CharField()
    feedback = serializers.ChoiceField(choices=['like', 'dislike','love'])


class NudgeOptionSerializer(serializers.Serializer):
    text = serializers.CharField()
    value = serializers.CharField()


class NudgeDataSerializer(serializers.Serializer):
    text = serializers.CharField()
    options = NudgeOptionSerializer(many=True, required=False)


class NudgeFlowSerializer(serializers.Serializer):
    nudge_key = serializers.CharField()
    nudge_data = NudgeDataSerializer()